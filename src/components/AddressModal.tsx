import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Search, Navigation2, CheckCircle, Plus } from 'lucide-react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddressSelect: (pincode: string, address: string) => void;
}

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

function AddressForm({ onSave, onCancel }: { onSave: (addr: any) => void, onCancel: () => void }) {
  const [flatNo, setFlatNo] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [pincode, setPincode] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    // Use PlaceAutocompleteElement web component if preferred, or the classic Autocomplete service
    const options = {
      fields: ['formatted_address', 'address_components', 'geometry', 'name'],
      componentRestrictions: { country: 'in' },
    };

    const autocomplete = new placesLib.Autocomplete(inputRef.current, options);

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      if (place.formatted_address) {
        setAddressLine(place.name + ", " + place.formatted_address);
      }

      // Find pincode
      let foundZip = "";
      place.address_components?.forEach(component => {
        if (component.types.includes('postal_code')) {
          foundZip = component.long_name;
        }
      });
      if (foundZip) {
        setPincode(foundZip);
      }
    });

  }, [placesLib]);

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Search Area/Building</label>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
          <input
            ref={inputRef}
            type="text"
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-stone-200 outline-none focus:border-amber-500 text-sm bg-stone-50"
            placeholder="Search on Google Maps..."
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Flat/Door No. & Building Name</label>
        <input
          type="text"
          className="w-full p-2.5 rounded-xl border border-stone-200 outline-none focus:border-amber-500 text-sm bg-stone-50"
          placeholder="e.g. 402, Shanti Vihar"
          value={flatNo}
          onChange={e => setFlatNo(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Street & Area (Autofilled)</label>
        <textarea
          rows={2}
          className="w-full p-2.5 rounded-xl border border-stone-200 outline-none focus:border-amber-500 text-sm bg-stone-50"
          placeholder="Area and City"
          value={addressLine}
          onChange={e => setAddressLine(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Pincode</label>
        <input
          type="text"
          className="w-full p-2.5 rounded-xl border border-stone-200 outline-none focus:border-amber-500 text-sm bg-stone-50"
          placeholder="e.g. 380015"
          value={pincode}
          onChange={e => setPincode(e.target.value)}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button 
          onClick={onCancel}
          className="flex-1 py-3 text-stone-600 font-bold bg-stone-100 hover:bg-stone-200 rounded-xl text-sm transition"
        >
          Cancel
        </button>
        <button 
          onClick={() => {
            if (pincode && addressLine) {
              onSave({ flatNo, addressLine, pincode, id: Date.now().toString() });
            } else {
              alert("Please search and select a valid address.");
            }
          }}
          className="flex-1 py-3 text-white font-bold bg-amber-500 hover:bg-amber-600 rounded-xl text-sm transition shadow-sm"
        >
          Save Address
        </button>
      </div>
    </div>
  );
}

function AddressModalContent({ onClose, onAddressSelect }: { onClose: () => void, onAddressSelect: (p: string, a: string) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([
    { id: '1', flatNo: 'B-201', addressLine: 'Satyamev Eminence, Science City Road, Ahmedabad', pincode: '380060' }
  ]);

  const handleSave = (addr: any) => {
    setSavedAddresses([addr, ...savedAddresses]);
    setIsAdding(false);
  };

  return (
    <div className="p-4 flex-1 flex flex-col min-h-0 bg-white">
      {isAdding ? (
        <AddressForm onSave={handleSave} onCancel={() => setIsAdding(false)} />
      ) : (
        <div className="flex flex-col h-full space-y-4">
          <button 
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl font-bold hover:bg-amber-100 transition shadow-sm"
          >
            <Plus className="w-5 h-5" /> Add New Address
          </button>
          
          <div className="space-y-3 overflow-y-auto flex-1 pb-4">
            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-widest mt-2 px-1">Saved Addresses</h4>
            {savedAddresses.map(addr => (
              <div 
                key={addr.id}
                onClick={() => onAddressSelect(addr.pincode, `${addr.flatNo ? addr.flatNo + ', ' : ''}${addr.addressLine}`)}
                className="p-3.5 border border-stone-200 rounded-2xl hover:border-amber-400 hover:bg-amber-50/30 cursor-pointer group transition flex items-start gap-3"
              >
                <div className="mt-0.5 bg-stone-100 group-hover:bg-amber-100 p-2 rounded-full text-stone-500 group-hover:text-amber-600 transition">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h5 className="font-bold text-stone-800 text-sm">{addr.flatNo ? addr.flatNo : 'Address'}</h5>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">{addr.addressLine}</p>
                  <p className="text-xs font-medium text-stone-700 mt-1">Pincode: {addr.pincode}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AddressModal({ isOpen, onClose, onAddressSelect }: AddressModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-900/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
      <div className="w-full sm:max-w-md h-[85vh] sm:h-[600px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col animate-slide-up overflow-hidden">
        
        <div className="px-4 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/80 sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500 text-white p-1.5 rounded-lg">
              <Navigation2 className="w-4 h-4" />
            </div>
            <h2 className="font-display font-bold text-lg text-stone-900">Select Location</h2>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex flex-col items-center justify-center rounded-full bg-stone-200/50 hover:bg-stone-200 text-stone-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {hasValidKey ? (
          <APIProvider apiKey={API_KEY} libraries={['places']}>
            <AddressModalContent onClose={onClose} onAddressSelect={onAddressSelect} />
          </APIProvider>
        ) : (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <MapPin className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-stone-800 text-lg">Google Maps API Key Required</h3>
            <p className="text-sm text-stone-500 leading-relaxed text-left">
              <strong>Step 1:</strong> Get an API Key from Google Maps.<br/>
              <strong>Step 2:</strong> Add your key as a secret in AI Studio:<br/><br/>
              • Open <strong>Settings</strong> (⚙️ gear icon, top-right)<br/>
              • Select <strong>Secrets</strong><br/>
              • Type <code>GOOGLE_MAPS_PLATFORM_KEY</code> as name<br/>
              • Paste your API key as value<br/><br/>
              The app builds automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
