document.addEventListener("DOMContentLoaded", function () {
  const slider = document.querySelector("#playbackSpeed");
  const output = document.querySelector("#currentSpeed");
  const resetButton = document.querySelector("#resetPlaybackSpeed");
  const resolutionSelect = document.querySelector("#videoResolution");

  // Função para obter dados do armazenamento
  const getFromStorage = (key) =>
    new Promise((resolve) => {
      chrome.storage.sync.get(key, (data) => {
        resolve(data[key]);
      });
    });

  // Função para definir dados no armazenamento
  const setInStorage = (key, data) =>
    new Promise((resolve) => {
      const dataObject = { [key]: data };
      chrome.storage.sync.set(dataObject, resolve);
    });

  // Função para obter a aba ativa
  const getActiveTab = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    return tab;
  };

  // Função para executar script na aba ativa
  const executeScriptInActiveTab = async (functionCode, args) => {
    const tab = await getActiveTab();
    const tabId = tab.id;
    return new Promise((resolve) => {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          function: functionCode,
          args: args,
        },
        resolve
      );
    });
  };

  // Função para definir a resolução
  const setResolution = async (resolution) => {
    const tab = await getActiveTab();
    const tabId = tab.id;
    const functionCode = (resolution) => {
      const videoElements = document.querySelectorAll("video");
      videoElements.forEach((videoElement) => {
        videoElement.setAttribute(
          "src",
          videoElement
            .getAttribute("src")
            .replace(/\/[0-9]+x[0-9]+\//, `/${resolution}x${resolution}/`)
        );
      });
    };
    await executeScriptInActiveTab(functionCode, [resolution]);
    await setInStorage("lastSetResolution", resolution);
  };

  // Função para definir a velocidade de reprodução dos vídeos na página
  const setPlaybackSpeed = async (speed) => {
    const functionCode = (speed) => {
      const videoElements = document.querySelectorAll("video");
      videoElements.forEach((videoElement) => {
        videoElement.playbackRate = speed;
      });
    };
    await executeScriptInActiveTab(functionCode, [speed]);
    await setInStorage("lastSetSpeed", speed);
  };

  // Restaura a última velocidade e resolução salvas
  const getSavedSpeed = async () => {
    return (await getFromStorage("lastSetSpeed")) || 1;
  };

  const getSavedResolution = async () => {
    return (await getFromStorage("lastSetResolution")) || "auto";
  };

  // Define a resolução quando a página é carregada
  getSavedResolution().then((lastSetResolution) => {
    resolutionSelect.value = lastSetResolution;
  });

  // Atualiza a interface com a velocidade atual
  const updatePlaybackSpeedUI = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const tabId = tab.id;
    const functionCode = () => {
      const videos = document.querySelectorAll("video");
      if (videos.length > 0) {
        const playbackRate = videos[0].playbackRate;
        output.innerHTML = playbackRate.toFixed(2);
        slider.value = playbackRate.toFixed(2);
      }
    };
    await executeScriptInActiveTab(functionCode, []);
  };

  // Restaura a última velocidade salva
  getSavedSpeed().then((lastSetSpeed) => {
    setPlaybackSpeed(lastSetSpeed);
  });

  slider.addEventListener("input", () => {
    const speed = parseFloat(slider.value);
    output.innerHTML = speed.toFixed(2);
    setPlaybackSpeed(speed);
  });

  resolutionSelect.addEventListener("change", () =>
    setResolution(resolutionSelect.value)
  );

  resetButton.addEventListener("click", onResetClick);

  // Redefine a velocidade de reprodução para 1x
  function onResetClick() {
    slider.value = "1";
    output.innerHTML = "1.0";
    setPlaybackSpeed(1);
  }

  // Atualiza a interface com a velocidade atual quando a página é carregada
  updatePlaybackSpeedUI();
});
