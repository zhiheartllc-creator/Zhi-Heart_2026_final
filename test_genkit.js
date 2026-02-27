const { zhiChat } = require("./src/ai/flows/zhi-chat-flow");

async function test() {
  try {
    const res = await zhiChat({ userInput: "hola, probando" });
    console.log("Success:", res);
  } catch (e) {
    console.error("Error direct:", e);
  }
}
test();
