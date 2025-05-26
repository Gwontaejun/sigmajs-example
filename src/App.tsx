import React, { useEffect } from "react";
import CustomSigma from "./components/sigma";

function App() {
  useEffect(() => {
    loadAPI();
  }, []);

  const loadAPI = async () => {
    const obj = await fetch("https://jsonplaceholder.typicode.com/todos");

    console.log("obj", obj);
  };

  return (
    <div>
      <h2>CI/CD 테스트 중.</h2>
      <button onClick={loadAPI}>TEST BUTTON</button>
      <CustomSigma />
    </div>
  );
}

export default App;
