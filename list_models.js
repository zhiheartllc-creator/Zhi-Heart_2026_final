async function run() {
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyBSGufciDuBKAwutwVNhe7UzNoCB23IcOg");
    const data = await res.json();
    console.log(data);
  } catch (e) {
    console.error(e);
  }
}
run();
