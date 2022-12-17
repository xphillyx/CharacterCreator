import { Avatar } from "@mui/material"
import React, { useContext, useState } from "react"
import { apiService, sceneService } from "../services"
import useSound from "use-sound"
import Skin from "./Skin"
import cancel from "../../public/ui/selector/cancel.png"
import gsap from "gsap"
import * as THREE from "three"

import tick from "../../public/ui/selector/tick.svg"
import sectionClick from "../../public/sound/section_click.wav"
import { ApplicationContext } from "../ApplicationContext"
import FadeInOut from "./FadeAnimation"
import { SelectorContainerPos } from "../styles/SelectorStyle"
import defaultTemplates from "../data/base_models"

export default function Selector() {
  const {
    isMute,
    isHide,
    setRandomFlag,
    randomFlag,
    avatar,
    setAvatar,
    setLoadedTraits,
    setTemplate,
    template,
    scene,
    category,
    templateInfo,
    setTemplateInfo,
    model,
    controls,
    selectedCharacterClass,
  } = useContext(ApplicationContext)

  const [selectValue, setSelectValue] = useState("0")
  const [hairCategory, setHairCategory] = useState("style")
  const [colorCategory, setColorCategory] = useState("color")

  const [collection, setCollection] = useState([])
  const [traitName, setTraitName] = useState("")

  const [loadingTrait, setLoadingTrait] = useState({ loaded: 0, total: 0 })
  const [loadingTraitOverlay, setLoadingTraitOverlay] = useState(false)
  const [noTrait, setNoTrait] = useState(true)
  const [loaded, setLoaded] = useState(false)
  let loadedPercent = Math.round(
    (loadingTrait.loaded * 100) / loadingTrait.total,
  )

  const [textureOptions, setTextureOptions] = useState([])
  const [selectionMode, setSelectionMode] = useState(0) // 0 base, 1 texture, 2 color

  const [inverse, setInverse] = useState(false)
  const container = React.useRef()
  const [play] = useSound(sectionClick, { volume: 1.0 })
  const iconPath = "./3d/icons-gradient/" + category + ".svg"

  const selectorButton = {
    display: "flex",
    justifyContent: "center",
    cursor: "pointer",
    width: "4em",
    height: "4em",
    padding: "1em",

    background: "rgba(81, 90, 116, 0.2)",
    backdropFilter: "blur(22.5px)",
    borderRadius: "5px",
  }

  const selectorButtonActive = {
    display: "flex",
    justifyContent: "center",
    cursor: "pointer",
    width: "4em",
    height: "4em",
    padding: "1em",
    background: "rgba(81, 90, 116, 0.2)",
    backdropFilter: "blur(22.5px)",
    borderRadius: "5px",
    borderBottom: "4px solid #61E5F9",
  }

  const selectOption = (option) => {
    moveCamera(option.cameraTarget)
    !isMute && play()
  }

  const moveCamera = (value) => {
    if (value) {
      setInverse(!inverse)

      gsap.to(controls.target, {
        y: value.height,
        duration: 1,
      })

      gsap
        .fromTo(
          controls,
          {
            maxDistance: controls.getDistance(),
            minDistance: controls.getDistance(),
            minPolarAngle: controls.getPolarAngle(),
            minAzimuthAngle: controls.getAzimuthalAngle(),
            maxAzimuthAngle: controls.getAzimuthalAngle(),
          },
          {
            maxDistance: value.distance,
            minDistance: value.distance,
            minPolarAngle: Math.PI / 2 - 0.11,
            minAzimuthAngle: inverse ? -0.78 : 0.78,
            maxAzimuthAngle: inverse ? -0.78 : 0.78,
            duration: 1,
          },
        )
        .then(() => {
          controls.minPolarAngle = 0
          controls.minDistance = 0.5
          controls.maxDistance = 2.0
          controls.minAzimuthAngle = Infinity
          controls.maxAzimuthAngle = Infinity
        })
    }
  }
  React.useEffect(() => {
    if (!scene || !templateInfo) return
    if (category) {
      apiService.fetchTraitsByCategory(category).then((traits) => {
        if (traits) {
          setCollection(traits.collection)
          setTraitName(traits.trait)
        }
      })
    }
  }, [category, scene, templateInfo])

  React.useEffect(() => {
    localStorage.removeItem("color")
  }, [template])

  React.useEffect(() => {
    if (!scene) return
    async function _get() {
      if (!loaded && selectedCharacterClass !== null) {
        setTemplateInfo(defaultTemplates[selectedCharacterClass])
      }
    }
    _get()
  }, [
    loaded,
    selectedCharacterClass,
    scene,
    templateInfo ? Object.keys(templateInfo).length : templateInfo,
  ])
  React.useEffect(() => {}, [isHide])

  React.useEffect(() => {
    ;(async () => {
      if (randomFlag === -1) return

      const lists = apiService.fetchCategoryList()
      let ranItem
      //Object.entries(avatar).map((props ) => {
      //let traitName = props[0];

      // if (avatar[traitName] && avatar[traitName].vrm) {
      //   sceneService.disposeVRM(avatar[traitName].vrm)
      //   setAvatar({
      //     ...avatar,
      //     [traitName]: {}
      //   })
      // }

      //scene.remove(avatar[traitName].model);
      //})
      let buffer = { ...avatar }
      //const total = lists.length;
      //let loaded = 0;
      let loaded = 0
      for (let i = 0; i < lists.length; i++) {
        await apiService
          .fetchTraitsByCategory(lists[i])
          .then(async (traits) => {
            if (traits) {
              const collection = traits.collection
              ranItem =
                collection[Math.floor(Math.random() * collection.length)]
              if (avatar[traits.trait]) {
                if (avatar[traits.trait].traitInfo != ranItem) {
                  const temp = await itemLoader(ranItem, traits, false)
                  loaded += 100 / lists.length
                  setLoadedTraits(loaded - 1)
                  buffer = { ...buffer, ...temp }
                }
              }
            }
          })
      }
      for (const property in buffer) {
        if (buffer[property].vrm) {
          if (avatar[property].vrm != buffer[property].vrm) {
            if (avatar[property].vrm != null) {
              sceneService.disposeVRM(avatar[property].vrm)
            }
          }
          model.data.animationManager.startAnimation(buffer[property].vrm)
          model.scene.add(buffer[property].vrm.scene)
        }
      }
      //with random
      setAvatar({
        ...avatar,
        ...buffer,
      })
      if (randomFlag == 1) {
        setLoadedTraits(true)
      }
      setRandomFlag(-1)
    })()
  }, [randomFlag])


  const selectTexture = (traitTexture) => {
    new THREE.TextureLoader().load(
      `${templateInfo.traitsDirectory}${traitTexture.directory}`,
      (txt) => {
        txt.flipY = false
        txt.encoding = THREE.sRGBEncoding
        avatar[category].model.traverse((child) => {
          if (child.isMesh) {
            child.material[0].map = txt
            child.material[0].shadeMultiplyTexture = txt
          }
        })
      },
    )
  }

  const selectTrait = (trait, textureIndex) => {
    if (trait.bodyTargets) {
      setTemplate(trait.id)
    }
    if (scene) {
      if (trait === "0") {
        setNoTrait(true)
        setTextureOptions([])
        if (avatar[traitName] && avatar[traitName].vrm) {
          sceneService.disposeVRM(avatar[traitName].vrm)
          setAvatar({
            ...avatar,
            [traitName]: {},
          })
        }
        //sceneService.
      } else {
        // if (trait.textures){
        //   setTextureOptions(trait.textures);
        // }
        // else{
        //   setTextureOptions([]);
        // }
        if (trait.bodyTargets) {
          setTemplate(trait.id)
        } else {
          setLoadingTraitOverlay(true)
          setNoTrait(false)
          templateInfo.selectionTraits.map((item) => {
            if (item.name === category && item.type === "texture") {
              textureTraitLoader(item, trait)
            } else if (item.name === category) {
              if (trait.textureCollection && textureIndex) {
                apiService
                  .fetchTraitsByCategory(trait.textureCollection)
                  .then((txtrs) => {
                    const localDir = txtrs.collection[textureIndex].directory
                    const texture = templateInfo.traitsDirectory + localDir
                    const loader = new THREE.TextureLoader()
                    loader.load(texture, (txt) => {
                      txt.encoding = THREE.sRGBEncoding
                      txt.flipY = false
                      itemLoader(trait, null, true, txt)
                    })
                  })
              } else {
                itemLoader(trait, null, true)
              }
            }
          })
        }
      }
    }
    setSelectValue(trait && trait.id)
  }
  let loading

  const itemLoader = async (
    item,
    traits = null,
    addToScene = true,
    texture,
  ) => {
    let r_vrm
    const vrm = await sceneService.loadModel(
      `${templateInfo.traitsDirectory}${item && item.directory}`,
    )
    //console.log(item)
    sceneService.addModelData(vrm, {
      cullingLayer: item.cullingLayer || -1,
      cullingDistance: item.cullingDistance || null,
    })
    r_vrm = vrm
    new Promise((resolve) => {
      // if scene, resolve immediately
      if (scene && scene.add) {
        resolve()
      } else {
        // if scene is null, wait for it to be set
        const interval = setInterval(() => {
          if (scene && scene.add) {
            clearInterval(interval)
            resolve()
          }
        }, 100)
      }
    })

    setLoadingTrait({ ...loadingTrait })

    // small timer to avoid quickly clicking
    setTimeout(() => {
      setLoadingTraitOverlay(false)
    }, 500)

    if (addToScene) {
      if (model.data.animationManager)
        model.data.animationManager.startAnimation(vrm)
      setTimeout(() => {
        // wait for it to play

        if (texture) {
          vrm.scene.traverse((child) => {
            if (child.isMesh) {
              child.material[0].map = texture
              child.material[0].shadeMultiplyTexture = texture
            }
          })
        }
        //texture area
        model.scene.add(vrm.scene)
        if (avatar[traitName]) {
          const traitData = templateInfo.selectionTraits.find(
            (element) => element.name === traitName,
          )

          // set the new trait
          const newAvatarData = {}
          newAvatarData[traitName] = {
            traitInfo: item,
            model: vrm.scene,
            vrm: vrm,
          }

          // search in the trait data for restricted traits and restricted types  => (todo)
          if (traitData) {
            if (traitData.restrictedTraits) {
              traitData.restrictedTraits.forEach((restrictTrait) => {
                if (avatar[restrictTrait] !== undefined)
                  newAvatarData[restrictTrait] = {}
              })
            }

            // 2 exists:
            // traitInfo that comes from the user and
            // traitData the comes from the setup

            // first check for every trait type in avatar properties if we have restricted types
            if (traitData.restrictedTypes) {
              // check every property in avatar for restricted types
              // also check if current trait has restricted type
              for (const property in avatar) {
                console.log("property", avatar[property])
                if (
                  !avatar[property].traitInfo ||
                  !avatar[property].traitInfo.type
                )
                  continue
                const itemTypes = Array.isArray(avatar[property].traitInfo.type)
                  ? avatar[property].traitInfo.type
                  : [avatar[property].traitInfo.type]

                for (let i = 0; i < traitData.restrictedTypes.length; i++) {
                  const restrictedType = traitData.restrictedTypes[i]

                  // remove if  its type is restricted
                  for (let j = 0; j < itemTypes.length; j++) {
                    const itemType = itemTypes[j]
                    if (itemType === restrictedType) {
                      newAvatarData[property] = {}
                      break
                    }
                  }
                }
              }
            }
            // now check inside every property if they dont have this type as restriction keep going
            if (item.type) {
              const itemTypes = getAsArray(item.type)
              for (const property in avatar) {
                const tData = templateInfo.selectionTraits.find(
                  (element) => element.name === property,
                )
                if (tData != null) {
                  if (tData.restrictedTypes) {
                    const restrictedTypeArray = tData.restrictedTypes

                    // make sure to include also typeRestrictions if they exist
                    // const restrictedTypeArray = !templateInfo.typeRestrictions?
                    //   tData.restrictedTypes :
                    //   [...tData.restrictedTypes, ... getAsArray(templateInfo.typeRestrictions[item.type])]

                    // console.log("here");
                    // console.log(restrictedTypeArray)
                    // console.log(tData.restrictedTypes)

                    for (let i = 0; i < restrictedTypeArray.length; i++) {
                      const restrictedType = tData.restrictedTypes[i]

                      for (let j = 0; j < itemTypes.length; j++) {
                        const itemType = itemTypes[j]
                        if (itemType === restrictedType) {
                          newAvatarData[property] = {}
                          break
                        }
                      }
                    }
                  }
                }
              }
              // this array include the names of the traits as property and the types it cannot include
              if (templateInfo.typeRestrictions) {
                // we should check every type this trait has
                for (let i = 0; i < itemTypes.length; i++) {
                  const itemType = itemTypes[i]
                  console.log(itemType)
                  // and get the restriction included in each array if exists
                  const typeRestrictions = getAsArray(
                    templateInfo.typeRestrictions[itemType],
                  )
                  // now check if the avatar properties include this restrictions to remove
                  for (const property in avatar) {
                    if (property !== traitName) {
                      typeRestrictions.forEach((typeRestriction) => {
                        if (avatar[property].traitInfo?.type) {
                          const types = avatar[property].traitInfo.type
                          for (let i = 0; i < types.length; i++) {
                            if (types[i] === typeRestriction) {
                              newAvatarData[property] = {}
                              break
                            }
                          }
                        }
                      })
                      // check also if any of the current trait is of type
                      if (avatar[property].vrm) {
                        const propertyTypes = getAsArray(
                          avatar[property].traitInfo.type,
                        )
                        propertyTypes.forEach((t) => {
                          const typeRestrictionsSecondary = getAsArray(
                            templateInfo.typeRestrictions[t],
                          )
                          if (typeRestrictionsSecondary.includes(itemType))
                            newAvatarData[property] = {}
                        })
                      }
                    }
                  }
                }
              }
            }
          }

          // combine current data with new data
          const newAvatar = {
            ...avatar,
            ...newAvatarData,
          }

          // now compare others with thair restricted traits, if they have a restriction with
          // current selected trait, !must be removed the other one, not this one
          for (const property in newAvatar) {
            if (property !== traitName) {
              if (newAvatar[property].vrm) {
                const tdata = templateInfo.selectionTraits.find(
                  (element) => element.name === property,
                )
                const restricted = tdata.restrictedTraits
                if (restricted) {
                  for (let i = 0; i < restricted.length; i++) {
                    if (restricted[i] === traitName) {
                      // if one of their restrcited elements match, remove him and break
                      newAvatarData[property] = {}
                      break
                    }
                  }
                }
              }
            }
          }
          setAvatar({ ...newAvatar, ...newAvatarData })

          for (const property in newAvatarData) {
            if (avatar[property].vrm) {
              sceneService.disposeVRM(avatar[property].vrm)
            }
          }
          // if (avatar[traitName].vrm) {
          //     sceneService.disposeVRM(avatar[traitName].vrm);
          // }
        }
      }, 200) // timeout for animations
    }

    console.log("************** TRAIT IS", traits)

    return (
      traits && {
        [traits.trait]: {
          traitInfo: item,
          model: r_vrm.scene,
          vrm: r_vrm,
        },
      }
    )
    // });
  }
  // always return an array
  const getAsArray = (target) => {
    if (target == null) return []

    return Array.isArray(target) ? target : [target]
  }

  const checkRestrictedTraits = (avatar, traitData, restrict = true) => {
    const newAvatarData = {}

    if (traitData) {
      if (traitData.restrictedTraits) {
        traitData.restrictedTraits.forEach((restrict) => {
          if (avatar[restrict] !== undefined) {
            if (restrict) {
              newAvatarData[restrict] = {}
            }
          }
        })
      }
    }
  }

  const textureTraitLoader = (props, trait) => {
    if (typeof props.target != "string") {
      for (let i = 0; i < props.target.length; i++) {
        const object = scene.getObjectByName(props.target[i])
        if (typeof trait.directory != "string") {
          let texture = ""

          if (trait.directory[i] != null)
            //grab the texture with same object position
            texture = templateInfo.traitsDirectory + trait.directory[i]
          //else grab the latest texture in the array
          else
            texture =
              templateInfo.traitsDirectory +
              trait.directory[trait.directory.length - 1]

          new THREE.TextureLoader().load(texture, (txt) => {
            txt.encoding = THREE.sRGBEncoding
            txt.flipY = false
            object.material[0].map = txt
            object.material[0].shadeMultiplyTexture = txt
            setTimeout(() => {
              setLoadingTraitOverlay(false)
            }, 500)
          })
        } else {
          const texture = templateInfo.traitsDirectory + trait.directory
          new THREE.TextureLoader().load(texture, (txt) => {
            txt.encoding = THREE.sRGBEncoding
            txt.flipY = false
            object.material[0].map = txt
            setTimeout(() => {
              setLoadingTraitOverlay(false)
            }, 500)
          })
        }
      }
    } else {
      const object = scene.getObjectByName(props.target)
      const texture =
        typeof trait.directory === "string"
          ? templateInfo.traitsDirectory + trait.directory
          : templateInfo.traitsDirectory + trait.directory[0]
      new THREE.TextureLoader().load(texture, (txt) => {
        txt.encoding = THREE.sRGBEncoding
        txt.flipY = false
        object.material[0].map = txt
        setTimeout(() => {
          setLoadingTraitOverlay(false)
        }, 500)
      })
    }
  }

  const getActiveStatus = (item) => {
    return (
      avatar[category] &&
      avatar[category].traitInfo &&
      avatar[category].traitInfo.id === item.id
    )
  }
  return (
    <FadeInOut show={!isHide} duration={300}>
      <SelectorContainerPos loadingOverlay={loadingTraitOverlay}>
        <div className="selector-container">
          <div className="traitPanel">
            {templateInfo.traitsDirectory && (
              <div className="traits">
                {category !== "head" || hairCategory !== "color" ? (
                  <React.Fragment>
                    <div
                      className={
                        noTrait ? "selectorButtonActive" : "selectorButton"
                      }
                      onClick={() => {
                        selectTrait("0")
                        !isMute && play()
                      }}
                    >
                      <img
                        className="icon"
                        src={cancel}
                        style={{
                          width: "3em",
                          height: "3em",
                        }}
                      />
                    </div>
                    {selectionMode === 0 &&
                      collection &&
                      collection.map((item, index) => {
                        return !item.thumbnailOverrides ? (
                          <div
                            key={index}
                            style={
                              getActiveStatus(item)
                                ? selectorButtonActive
                                : selectorButton
                            }
                            className={`selector-button coll-${traitName} ${
                              selectValue === item.id ? "active" : ""
                            }`}
                            onClick={() => {
                              !isMute && play()
                              selectTrait(item)
                            }}
                          >
                            <img
                              className="trait-icon"
                              src={
                                item.thumbnailsDirectory
                                  ? item.thumbnail
                                  : `${templateInfo.thumbnailsDirectory}${item.thumbnail}`
                              }
                            />
                            <img
                              src={tick}
                              className={
                                getActiveStatus(item)
                                  ? "tickStyle"
                                  : "tickStyleInActive"
                              }
                            />
                            {selectValue === item.id && loadedPercent > 0 && (
                              <div className="loading-trait">
                                {loadedPercent}%
                              </div>
                            )}
                          </div>
                        ) : (
                          item.thumbnailOverrides.map((icn, icnindex) => {
                            return (
                              <div
                                key={index + "_" + icnindex}
                                style={selectorButton}
                                //style={getActiveStatus(icn) ? selectorButtonActive : selectorButton }
                                className={`selector-button coll-${traitName} ${
                                  selectValue === item.id ? "active" : ""
                                }`}
                                onClick={() => {
                                  !isMute && play()
                                  selectTrait(item, icnindex)
                                }}
                              >
                                <img
                                  className="trait-icon"
                                  src={`${templateInfo.thumbnailsDirectory}${icn}`}
                                />
                                <img
                                  src={tick}
                                  className={
                                    getActiveStatus(item)
                                      ? "tickStyle"
                                      : "tickStyleInActive"
                                  }
                                />
                                {selectValue === item.id &&
                                  loadedPercent > 0 && (
                                    <div className="loading-trait">
                                      {loadedPercent}%
                                    </div>
                                  )}
                              </div>
                            )
                          })
                        )
                      })}
                    {/* to - do, set this to be with a fn rather than duplicating */}
                    {selectionMode === 1 &&
                      collection &&
                      textureOptions.map((item, index) => {
                        return (
                          <div
                            key={index}
                            style={
                              getActiveStatus(item)
                                ? selectorButtonActive
                                : selectorButton
                            }
                            className={`selector-button coll-${traitName} ${
                              selectValue === item.id ? "active" : ""
                            }`}
                            onClick={() => {
                              !isMute && play()
                              selectTexture(item)
                              //selectTrait(item)
                            }}
                          >
                            <img
                              className="trait-icon"
                              src={
                                item.thumbnailsDirectory
                                  ? item.thumbnail
                                  : `${templateInfo.thumbnailsDirectory}${item.thumbnail}`
                              }
                            />
                            <img
                              src={tick}
                              className={
                                getActiveStatus(item)
                                  ? "tickStyle"
                                  : "tickStyleInActive"
                              }
                            />
                            {selectValue === item.id && loadedPercent > 0 && (
                              <div className="loading-trait">
                                {loadedPercent}%
                              </div>
                            )}
                          </div>
                        )
                      })}
                    <div className="icon-hidden">
                      <Avatar className="icon" />
                    </div>
                  </React.Fragment>
                ) : (
                  <Skin category={category} avatar={avatar} />
                )}
              </div>
            )}
          </div>
          <div
            className={
              loadingTraitOverlay
                ? "loading-trait-overlay"
                : "loading-trait-overlay-show"
            }
          />
        </div>
      </SelectorContainerPos>
    </FadeInOut>
  )
}
