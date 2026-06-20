import fetch from "node-fetch";

async function main() {
  try {
    const res = await fetch("http://localhost:3000/api/customers/check-phone?phone=919582411551");
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body:", text);
  } catch (err: any) {
    console.error("Error:", err.message);
  }
}
main();
