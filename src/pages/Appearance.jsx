import React, { useContext, useEffect } from "react"
import styles from "./Appearance.module.css"
import { ViewMode, ViewContext } from "../context/ViewContext"
import { SceneContext } from "../context/SceneContext"
import Editor from "../components/Editor"
import CustomButton from "../components/custom-button"
import { LanguageContext } from "../context/LanguageContext"
import { SoundContext } from "../context/SoundContext"
import { AudioContext } from "../context/AudioContext"

import {
  getAllTemplateOptions
} from "../library/option-utils"

function Appearance({
  animationManager,
  blinkManager,
  lookatManager,
  effectManager,
  fetchNewModel,
}) {
  const { isLoading, setViewMode } = React.useContext(ViewContext)
  const {
    templateInfo,
    resetAvatar,
    getRandomCharacter,
    isChangingWholeAvatar,
    setIsChangingWholeAvatar,
  } = React.useContext(SceneContext)

  const { playSound } = React.useContext(SoundContext)
  const { isMute } = React.useContext(AudioContext)
  const back = () => {
    !isMute && playSound('backNextButton');
    resetAvatar()
    setViewMode(ViewMode.CREATE)
  }

  const next = () => {
    !isMute && playSound('backNextButton');
    setViewMode(ViewMode.BIO)
  }


  // TODO: hardcode fetched manifest json, because if they add more
  // traits in the future, it could break the functionality (e.g. need to make sure color mapping is there)
  const chatWithLLM = () => {
    /*
    if (!isChangingWholeAvatar) {
      !isMute && playSound('randomizeButton');
      getRandomCharacter()
    }
    */

    const options = getAllTemplateOptions(templateInfo);

    const options2 = {};

    for (const traitName in options) {
      const traits = options[traitName];

      const traits2 = traits.map((trait) => {
        const trait2 = {
          "item name": null,
          "texture trait name": null,
          "color trait name": null,
        }

        trait2["item name"] = trait.item.name;
        if (trait.textureTrait) {
          trait2["texture trait name"] = trait.textureTrait.name;
        }
        if (trait.colorTrait) {
          trait2["color trait name"] = trait.colorTrait.name;
        }

        return trait2;
      });

      options2[traitName] = traits2;
    }

    console.log("options2", options2);

    // group traits by item name

    const options3 = {};

    for (const traitName in options2) {
      const traits = options2[traitName];

      const map = {};
      for (const trait of traits) {
        const itemName = trait["item name"];
        if (!map[itemName]) {
          map[itemName] = {
            "texture trait names": [],
            "color trait names": [],
          };
        }

        if (trait["texture trait name"]) {
          map[itemName]["texture trait names"].push(trait["texture trait name"]);
        }
        if (trait["color trait name"]) {
          map[itemName]["color trait names"].push(trait["color trait name"]);
        }

        if (map[itemName]["texture trait names"].length > 0 && map[itemName]["color trait names"].length > 0) {
          throw "Unexpected to have both nonzero texture trait names and color trait names";
        }
      }

      options3[traitName] = map;
    }

    console.log("options3", options3);

    // LLM readable version

    let text = '';

    for (const traitName in options3) {
      const traits = options3[traitName];

      text += `For the ${traitName} trait, you can choose from the following items:\n`;

      for (const trait in traits) {
        const data = traits[trait];

        text += `- ${trait} with `;

        if (data["texture trait names"] && data["texture trait names"].length > 0) {
          text += `the following texture traits: ${data["texture trait names"].join(", ")}\n`;
        } else if (data["color trait names"] && data["color trait names"].length > 0) {
          text += `the following color traits: ${data["color trait names"].join(", ")}\n`;
        } else {
          throw 'Unexpected error'
        }
      }

      text += `\n`;
    }

    console.log("LLM readable text", text);

  }

  const randomize = () => {
    if (!isChangingWholeAvatar) {
      !isMute && playSound('randomizeButton');
      getRandomCharacter()
    }
  }

  useEffect(() => {
    const setIsChangingWholeAvatarFalse = () => setIsChangingWholeAvatar(false)

    effectManager.addEventListener(
      "fadeintraitend",
      setIsChangingWholeAvatarFalse,
    )
    effectManager.addEventListener(
      "fadeinavatarend",
      setIsChangingWholeAvatarFalse,
    )
    return () => {
      effectManager.removeEventListener(
        "fadeintraitend",
        setIsChangingWholeAvatarFalse,
      )
      effectManager.removeEventListener(
        "fadeinavatarend",
        setIsChangingWholeAvatarFalse,
      )
    }
  }, [])

  // Translate hook
  const { t } = useContext(LanguageContext)

  return (
    <div className={styles.container}>
      <div className={`loadingIndicator ${isLoading ? "active" : ""}`}>
        <img className={"rotate"} src="ui/loading.svg" />
      </div>
      <div className={"sectionTitle"}>{t("pageTitles.chooseAppearance")}</div>
      <Editor
        animationManager={animationManager}
        blinkManager={blinkManager}
        lookatManager={lookatManager}
        effectManager={effectManager}
        fetchNewModel={fetchNewModel}
      />
      <div className={styles.buttonContainer}>
        <CustomButton
          theme="light"
          text={t('callToAction.back')}
          size={14}
          className={styles.buttonLeft}
          onClick={back}
        />
        <CustomButton
          theme="light"
          text={t('callToAction.next')}
          size={14}
          className={styles.buttonRight}
          onClick={next}
        />
        <CustomButton
          theme="light"
          text={t('callToAction.chatWithLLM')}
          size={14}
          className={styles.buttonCenter}
          onClick={chatWithLLM}
        />
        <CustomButton
          theme="light"
          text={t('callToAction.randomize')}
          size={14}
          className={styles.buttonCenter}
          onClick={randomize}
        />
      </div>
    </div>
  )
}

export default Appearance
