const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testKey(name, key) {
  console.log(`Testing key: ${name} (${key.substring(0, 10)}...)`);
  try {
    const genAI = new GoogleGenerativeAI(key.trim());
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Di 'Hola Miguel, el robot funciona'");
    const response = await result.response;
    console.log(`✅ Success for ${name}: ${response.text()}`);
  } catch (error) {
    console.log(`❌ Failed for ${name}: ${error.message}`);
  }
}

const keys = [
  { name: "j1sg", key: "AIzaSyBVLSuHTuSG3JhKOOgahGD_LASHzJjj1sg" },
  { name: "mMd4", key: "AIzaSyAYUDtUtveeaKJCxmK__rKP5duxKOwmMd4" }
];

async function run() {
  for (const k of keys) {
    await testKey(k.name, k.key);
  }
}

run();
