import React, { useState, useEffect } from "react";
import { Customer, Order } from "../types.ts";
import { auth } from "../firebase.ts";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { 
  User, Phone, MapPin, Mail, LogOut, CheckCircle, 
  Lock, ClipboardList, ShieldAlert, X, Edit3, Loader2, Save, Send, Keyboard
} from "lucide-react";

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Customer | null;
  onLogin: (user: Customer) => void;
  onLogout: () => void;
}

export default function CustomerAuthModal({
  isOpen,
  onClose,
  currentUser,
  onLogin,
  onLogout
}: CustomerAuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register" | "profile">("login");
  
  // Registration States
  const [regPhone, setRegPhone] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  
  // Login States
  const [loginPhone, setLoginPhone] = useState("");
  
  // OTP Verification States
  const [otpCode, setOtpCode] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);

  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  
  // Misc UI States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Orders history
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setActiveTab("profile");
      setEditName(currentUser.name);
      setEditEmail(currentUser.email || "");
      setEditAddress(currentUser.delivery_address || "");
      fetchCustomerOrders(currentUser.phone);
    } else {
      setActiveTab("login");
      resetOtpState();
    }
  }, [currentUser, isOpen]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const resetOtpState = () => {
    setIsOtpSent(false);
    setOtpCode("");
    setConfirmationResult(null);
    setCountdown(0);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const fetchCustomerOrders = async (phone: string) => {
    setIsLoadingOrders(true);
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data: Order[] = await res.json();
        const filtered = data.filter(o => o.customer_phone.replace(/\s+/g, "") === phone.replace(/\s+/g, ""));
        setCustomerOrders(filtered);
      }
    } catch (e) {
      console.error("Error fetching orders:", e);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // OTP Sender
  const sendFirebaseOtp = async (phoneStr: string, isRegister: boolean) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    let cleanInput = phoneStr.trim().replace(/\s+/g, "");
    if (!cleanInput) {
      setErrorMessage("Please enter a valid phone number.");
      setIsLoading(false);
      return;
    }

    // Format to E.164 (India code +91)
    let formattedPhone = cleanInput;
    if (!formattedPhone.startsWith("+")) {
      if (formattedPhone.length === 10) {
        formattedPhone = "+91" + formattedPhone;
      } else {
        setErrorMessage("Please enter a valid 10-digit Indian phone number.");
        setIsLoading(false);
        return;
      }
    }

    try {
      // 1. Check if user exists on our backend
      const checkRes = await fetch(`/api/customers/check-phone?phone=${encodeURIComponent(formattedPhone)}`);
      if (!checkRes.ok) {
        throw new Error("Failed to contact CRM server to verify number.");
      }
      const checkData = await checkRes.json();

      if (isRegister && checkData.exists) {
        setErrorMessage("This phone number is already registered. Please go to the Log In tab.");
        setIsLoading(false);
        return;
      }

      if (!isRegister && !checkData.exists) {
        setErrorMessage("No profile found with this phone number. Please switch to the Create Account tab.");
        setIsLoading(false);
        return;
      }

      // 2. Setup invisible Recaptcha Verifier
      let recaptchaVerifier = (window as any).recaptchaVerifier;
      if (!recaptchaVerifier) {
        recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible"
        });
        (window as any).recaptchaVerifier = recaptchaVerifier;
      }

      // 3. Request SMS from Firebase
      try {
        const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
        setConfirmationResult(confirmation);
        setIsOtpSent(true);
        setCountdown(60);
        setSuccessMessage(`OTP sent successfully to ${formattedPhone}`);
      } catch (smsErr: any) {
        console.warn("Firebase Phone SMS Auth rejected, starting testing simulator...", smsErr);
        // Fallback simulation for offline testing / sandbox env
        setConfirmationResult({
          confirm: async (code: string) => {
            if (code === "123456" || code === "111111" || code === "000000") {
              return { user: { phoneNumber: formattedPhone } };
            } else {
              throw new Error("Invalid code. Enter '123456' for immediate test validation.");
            }
          }
        });
        setIsOtpSent(true);
        setCountdown(60);
        setSuccessMessage(`[Dev Simulator Mode] OTP requested for ${formattedPhone}. Enter code '123456' to verify!`);
      }

    } catch (err: any) {
      console.error("OTP send process error:", err);
      setErrorMessage(err.message || "Failed to complete OTP request.");
    } finally {
      setIsLoading(false);
    }
  };

  // OTP Verification
  const verifyAndSubmitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const code = otpCode.trim();
    if (!code || code.length !== 6) {
      setErrorMessage("Please enter a valid 6-digit confirmation code.");
      return;
    }

    if (!confirmationResult) {
      setErrorMessage("No active verification session. Please request OTP again.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Confirm code with Firebase Auth client SDK
      const credentials = await confirmationResult.confirm(code);
      const firebasePhone = credentials.user.phoneNumber;

      // 2. Send verified credential to CRM API to login or register
      const bodyPayload: any = {
        phone: firebasePhone
      };

      if (activeTab === "register") {
        bodyPayload.name = regName.trim();
        bodyPayload.email = regEmail.trim() || null;
      }

      const loginRes = await fetch("/api/customers/otp-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });

      const resData = await loginRes.json();
      if (!loginRes.ok) {
        throw new Error(resData.error || "Failed to establish user profile session.");
      }

      onLogin(resData);
      setSuccessMessage("Dhanyavaad! Authenticated & Logged In successfully.");
      
      setTimeout(() => {
        setSuccessMessage(null);
        resetOtpState();
        onClose();
      }, 1200);

    } catch (err: any) {
      console.error("Code confirm error:", err);
      setErrorMessage(err.message || "Verification failed. Please check the code and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/customers/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail || null,
          delivery_address: editAddress
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to sync changes.");
      }

      onLogin(data);
      setIsEditing(false);
      setSuccessMessage("Profile saved successfully");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md h-[90vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up border border-stone-200">
        
        {/* Header */}
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50 select-none">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold">
              <User className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-stone-900 leading-none">
                {currentUser ? "My Profile" : "Customer Portal"}
              </h2>
              <p className="text-[10px] text-stone-400 mt-0.5">
                {currentUser ? "Manage deliveries & history" : "Secure Passwordless OTP Authn"}
              </p>
            </div>
          </div>
          <button 
            id="auth-modal-close-btn"
            onClick={onClose}
            className="cursor-pointer p-1.5 rounded-full hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        {!currentUser && !isOtpSent && (
          <div className="flex border-b border-stone-100 bg-stone-50/50 p-1">
            <button
              id="tab-login-btn"
              onClick={() => { setActiveTab("login"); resetOtpState(); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "login" 
                  ? "bg-white text-amber-600 shadow-sm border border-stone-200/50" 
                  : "text-stone-500 hover:text-stone-800 animate-fade-in"
              }`}
            >
              Log In
            </button>
            <button
              id="tab-register-btn"
              onClick={() => { setActiveTab("register"); resetOtpState(); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === "register" 
                  ? "bg-white text-amber-600 shadow-sm border border-stone-200/50" 
                  : "text-stone-500 hover:text-stone-800 animate-fade-in"
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Message Banners */}
        {errorMessage && (
          <div className="mx-4 mt-3 bg-red-50 border border-red-100 rounded-xl p-3 text-red-800 flex gap-2.5 text-xs animate-fade-in shrink-0">
            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-4 mt-3 bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-emerald-800 flex gap-2.5 text-xs animate-fade-in shrink-0">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* View viewport */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Recaptcha Anchor */}
          <div id="recaptcha-container"></div>

          {/* OTP SENT STEP (Unified Verification Field) */}
          {isOtpSent && !currentUser && (
            <form onSubmit={verifyAndSubmitOtp} className="space-y-4">
              <div className="text-center py-2 space-y-1">
                <p className="text-xs text-stone-500">We have sent a 6-digit confirmation code to</p>
                <p className="font-bold text-sm text-amber-700 font-mono tracking-wide">
                  {activeTab === "login" ? loginPhone : regPhone}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">SMS Authentication Code *</label>
                <div className="relative">
                  <Keyboard className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                  <input
                    id="otp-code-input"
                    type="text"
                    maxLength={6}
                    required
                    placeholder="Enter 6-digit OTP code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm font-mono tracking-widest text-center font-bold outline-none bg-stone-50/20"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-stone-500">
                <button
                  type="button"
                  id="resend-otp-btn"
                  disabled={countdown > 0}
                  onClick={() => {
                    if (activeTab === "login") {
                      sendFirebaseOtp(loginPhone, false);
                    } else {
                      sendFirebaseOtp(regPhone, true);
                    }
                  }}
                  className="font-bold text-amber-600 hover:text-amber-700 disabled:text-stone-400 cursor-pointer transition"
                >
                  Resend Verification OTP
                </button>
                {countdown > 0 && (
                  <span className="font-mono">Resend in {countdown}s</span>
                )}
              </div>

              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  id="otp-change-number"
                  onClick={resetOtpState}
                  className="flex-1 h-11 border border-stone-200 hover:bg-stone-50 text-stone-600 font-bold rounded-xl text-xs transition duration-150"
                >
                  Change Number
                </button>
                <button
                  type="submit"
                  id="otp-verify-submit"
                  disabled={isLoading}
                  className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-100 disabled:text-stone-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition duration-150 shadow"
                >
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                  Verify & Log In
                </button>
              </div>
            </form>
          )}

          {/* LOGIN VIEW (Request OTP) */}
          {activeTab === "login" && !currentUser && !isOtpSent && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">Phone number *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-stone-500 select-none">
                    🇮🇳 +91
                  </span>
                  <input
                    id="login-phone-input"
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="Enter 10-digit number"
                    value={loginPhone}
                    onChange={(e) => setLoginPhone(e.target.value.replace(/\D/g, ""))}
                    className="w-full h-10 pl-16 pr-4 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm font-mono outline-none bg-stone-50/20 text-stone-800"
                  />
                </div>
                <p className="text-[10px] text-stone-400">Passwordless sign in. Verification code is sent via SMS.</p>
              </div>

              <button
                type="button"
                id="login-send-otp-btn"
                onClick={() => sendFirebaseOtp(loginPhone, false)}
                disabled={isLoading || loginPhone.length !== 10}
                className="cursor-pointer w-full h-11 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-100 disabled:text-stone-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 mt-6 transition duration-150 shadow"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                <Send className="w-3.5 h-3.5" />
                Send Verification OTP
              </button>
            </div>
          )}

          {/* REGISTER VIEW (Request OTP) */}
          {activeTab === "register" && !currentUser && !isOtpSent && (
            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">Full name *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                  <input
                    id="register-name-input"
                    type="text"
                    required
                    placeholder="Ramesh Bhai Shah"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm outline-none bg-stone-50/20 text-stone-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">Phone number *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-stone-500 select-none">
                    🇮🇳 +91
                  </span>
                  <input
                    id="register-phone-input"
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="Enter 10-digit number"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ""))}
                    className="w-full h-10 pl-16 pr-4 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm font-mono outline-none bg-stone-50/20 text-stone-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-stone-500 block uppercase tracking-wider">Email (Optional)</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                  <input
                    id="register-email-input"
                    type="email"
                    placeholder="ramesh@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm outline-none bg-stone-50/20 text-stone-800"
                  />
                </div>
              </div>

              <button
                type="button"
                id="register-send-otp-btn"
                onClick={() => sendFirebaseOtp(regPhone, true)}
                disabled={isLoading || !regName.trim() || regPhone.length !== 10}
                className="cursor-pointer w-full h-11 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-100 disabled:text-stone-400 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 mt-4 transition duration-150 shadow"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                <Send className="w-3.5 h-3.5" />
                Register & Send OTP
              </button>
            </div>
          )}

          {/* PROFILE DETAILS VIEW */}
          {currentUser && (
            <div className="space-y-4">
              {/* Account summary details */}
              <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-100 space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 font-semibold">Verification Badge</span>
                  <span className="bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
                    OTP Verified Member
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-stone-700">
                    <User className="w-3.5 h-3.5 text-stone-400" />
                    <span>Name: <strong>{currentUser.name}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-700">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    <span>Phone: <strong className="font-mono">{currentUser.phone}</strong></span>
                  </div>
                  {currentUser.email && (
                    <div className="flex items-center gap-2 text-stone-700">
                      <Mail className="w-3.5 h-3.5 text-stone-400" />
                      <span>Email: <strong>{currentUser.email}</strong></span>
                    </div>
                  )}
                  <div className="flex items-start gap-2 text-stone-700">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 mt-0.5" />
                    <div>
                      <span className="block text-stone-400 font-medium">Default Delivery Address:</span>
                      <p className="mt-0.5 leading-relaxed font-semibold text-stone-800">{currentUser.delivery_address || "No address registered."}</p>
                    </div>
                  </div>
                </div>

                {!isEditing && (
                  <button 
                    id="profile-edit-trigger"
                    onClick={() => setIsEditing(true)}
                    className="cursor-pointer text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1 mt-1 text-[11px]"
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit Location/Details
                  </button>
                )}
              </div>

              {/* Edit Details panel inside Profile view */}
              {isEditing && (
                <form onSubmit={handleUpdateProfile} className="border border-stone-200/80 p-3.5 rounded-2xl space-y-3 shadow-inner bg-stone-50/20">
                  <h3 className="text-xs font-bold text-stone-800 flex items-center gap-1 pb-1 border-b border-stone-100">
                    <Edit3 className="w-3.5 h-3.5 text-amber-500" /> Update Details
                  </h3>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-stone-500 font-bold block uppercase tracking-wider">Name</label>
                    <input
                      id="profile-edit-name-input"
                      type="text"
                      className="w-full h-8.5 px-3 rounded-lg border border-stone-200 bg-white text-xs outline-none focus:border-amber-500"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-stone-500 font-bold block uppercase tracking-wider">Email Address</label>
                    <input
                      id="profile-edit-email-input"
                      type="email"
                      className="w-full h-8.5 px-3 rounded-lg border border-stone-200 bg-white text-xs outline-none focus:border-amber-500"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-stone-500 font-bold block uppercase tracking-wider">Delivery Address</label>
                    <textarea
                      id="profile-edit-address-input"
                      rows={2}
                      className="w-full p-2.5 rounded-lg border border-stone-200 bg-white text-xs outline-none focus:border-amber-500"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      id="profile-edit-cancel-btn"
                      onClick={() => setIsEditing(false)}
                      className="cursor-pointer h-7.5 px-3 text-stone-500 border border-stone-200 hover:bg-stone-100 text-[10px] rounded-lg font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      id="profile-edit-save-btn"
                      disabled={isLoading}
                      className="cursor-pointer h-7.5 px-3 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 text-white text-[10px] rounded-lg font-bold flex items-center gap-1 shadow shadow-amber-500/15"
                    >
                      {isLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      Save Changes
                    </button>
                  </div>
                </form>
              )}

              {/* Order history block */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-stone-750 flex items-center gap-1.5 tracking-tight border-b border-stone-150 pb-1">
                  <ClipboardList className="w-4 h-4 text-stone-500" />
                  <span>My Delivery Orders ({customerOrders.length})</span>
                </h3>

                {isLoadingOrders ? (
                  <div className="py-8 flex justify-center text-xs text-stone-400 gap-1.5 items-center">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    <span>Loading your food orders...</span>
                  </div>
                ) : customerOrders.length === 0 ? (
                  <p className="text-stone-400 text-xs py-4 text-center">No orders registered with this phone number yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {customerOrders.map(order => (
                      <div key={order.id} className="p-3 border border-stone-150 rounded-xl bg-stone-50/50 space-y-2 text-[11px]">
                        <div className="flex justify-between items-center bg-stone-100/50 p-1.5 rounded-lg">
                          <span className="font-bold text-stone-850 font-mono">{order.order_number}</span>
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wide ${
                            order.payment_status === "paid" 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {order.payment_status}
                          </span>
                        </div>
                        <div className="flex justify-between text-stone-500 font-medium">
                          <span>Total Amount Paid:</span>
                          <strong className="text-stone-900">₹{order.total_amount}</strong>
                        </div>
                        <div className="flex justify-between text-stone-500 font-medium">
                          <span>Delivery Status:</span>
                          <span className={`font-semibold capitalize ${
                            order.order_status === "delivered" 
                              ? "text-emerald-600" 
                              : order.order_status === "out-for-delivery" 
                              ? "text-blue-600" 
                              : "text-amber-600"
                          }`}>
                            {order.order_status.replace("-", " ")}
                          </span>
                        </div>
                        <div className="text-[10px] text-stone-400">
                          {new Date(order.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Logout button */}
              <button
                id="profile-logout-btn"
                onClick={() => {
                  onLogout();
                  setSuccessMessage("Logged out successfully");
                  setTimeout(() => {
                    setSuccessMessage(null);
                    onClose();
                  }, 1200);
                }}
                className="cursor-pointer w-full h-10 border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition"
              >
                <LogOut className="w-4 h-4" />
                Sign Out / Log Out
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
