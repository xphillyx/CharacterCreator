import React, { useContext, useEffect, useState } from "react"
import styles from "./Appearance.module.css"
import { ViewMode, ViewContext } from "../context/ViewContext"
import { SceneContext } from "../context/SceneContext"
import Editor from "../components/Editor"
import CustomButton from "../components/custom-button"
import { LanguageContext } from "../context/LanguageContext"
import { SoundContext } from "../context/SoundContext"
import { AudioContext } from "../context/AudioContext"
import { getWindowAI } from 'window.ai';
import JSON5 from 'json5'

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
    setSelectedOptions
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

  const [avatarDescriptionInputValue, setAvatarDescriptionInputValue] = useState('');

  // TODO: hardcode fetched manifest json, because if they add more
  // traits in the future, it could break the functionality (e.g. need to make sure color mapping is there)
  const chatWithLLM = async () => {
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

        text += `- ${trait}, with `;

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

    // prompt

    let description = avatarDescriptionInputValue;

    let prompt = `
      You are an avatar builder, where you can choose from a variety of traits to create an avatar for the user.
      There are seven traits: body, eyes, head, chest, feet, legs, and outer.

      Here is the trait database you must use:

      ---

      ${text}

      ---

      Note that for the traits head, outer, chest, legs, and feet, you have the option to
      choose the item name as an empty string '' to indicate no option selected for that trait.

      The user requests you to build an avatar with the following description:
      "${description}".

      Please do your best to fulfill the user's request using the trait database only, and return the result in the following JSON format:

      {
        "body": {
          "item name": "<item name>",
          "texture trait": "<texture trait name>",
        },
        "eyes": {
          "item name": "<item name>",
          "texture trait": "<texture trait name>",
        },
        "head": {
          "item name": "<item name>",
          "color trait": "<color trait name>",
        },
        "chest": {
          "item name": "<item name>",
          "texture trait": "<texture trait name>",
        },
        "feet": {
          "item name": "<item name>",
          "texture trait": "<texture trait name>",
        },
        "legs": {
          "item name": "<item name>",
          "texture trait": "<texture trait name>",
        },
        "outer": {
          "item name": "<item name>",
          "texture trait": "<texture trait name>",
        }
      }

      Again, ONLY respond with the JSON; there should be no text before or after the JSON. 
    `;

    console.log('prompt', prompt);

    // call Window AI

    let ai;
    try {
      ai = await getWindowAI()
    } catch (error) {
      alert('window.ai not found. Please install at https://windowai.io/');
      return;
    }

    const messages = [
      {
        role: "system",
        content: prompt
      }];

    const response = await ai.generateText(
      {
        messages: messages
      },
      {
        temperature: 0.7,
        maxTokens: 200,
        // Handle partial results if they can be streamed in
        onStreamResult: (res) => {
          console.log(res.message.content)
        }
      }
    );

    console.log('generateText response', response);

    // parse response

    let content = response[0].message.content;
    content = content.trim();
    // remove leading and trailing quotes
    if (content.startsWith('"')) {
      content = content.substring(1);
    }
    if (content.endsWith('"')) {
      content = content.substring(0, content.length - 1);
    }

    // remove text before and after the JSON
    // remove text before the first "{"
    const firstOpenBraceIndex = content.indexOf("{");
    if (firstOpenBraceIndex == -1) {
      throw "Unexpected to not find first open brace";
    }
    content = content.substring(firstOpenBraceIndex);
    // remove text after the last "}"
    const lastCloseBraceIndex = content.lastIndexOf("}");
    if (lastCloseBraceIndex == -1) {
      throw "Unexpected to not find last close brace";
    }
    content = content.substring(0, lastCloseBraceIndex + 1);

    // use JSON5 to handle trailing commas returned by LLM
    const result = JSON5.parse(content);

    console.log('result', result);

    // convert response to avatar

    const matchedTemplateOptions = [];

    for (const traitName in result) {
      const trait = result[traitName];

      const itemName = trait["item name"];
      const textureTraitName = trait["texture trait"];
      const colorTraitName = trait["color trait"];

      if (textureTraitName && colorTraitName) {
        throw "Unexpected to have both texture trait and color trait";
      }

      // search for trait
      let matchedOption = null;
      let oneTrait = null;
      for (var i = 0; i < options[traitName].length; i++) {
        const option = options[traitName][i];
        let isMatch = false;
        oneTrait = option.trait;
        if (option.item.name == itemName) {
          if (textureTraitName) {
            if (option.textureTrait.name == textureTraitName) {
              isMatch = true;
            }
          }
          if (colorTraitName) {
            if (option.colorTrait.name == colorTraitName) {
              isMatch = true;
            }
          }
        }
        if (isMatch) {
          matchedOption = option;
          break;
        }
      }

      // option for empty trait value
      if (['head', 'outer', 'chest', 'legs', 'feet'].includes(traitName)) {
        if (itemName == '') {
          matchedTemplateOptions.push({
            item: null,
            trait: oneTrait,
          })
          continue;
        }
      }

      if (!matchedOption) {
        console.error('no matching option for trait', trait);
        throw "Unexpected to not find a matching option";
      }

      matchedTemplateOptions.push(matchedOption);
    }

    console.log('matchedTemplateOptions', matchedTemplateOptions);

    // set React state with new template options
    setSelectedOptions(matchedTemplateOptions);
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
        <input 
          type="text"
          placeholder="Avatar description"
          className={styles.description_input}
          value={avatarDescriptionInputValue}
          onChange={(e) => setAvatarDescriptionInputValue(e.target.value)}
          size="32"
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
