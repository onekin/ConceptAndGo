import Alerts from '../../utils/Alerts'
import FileUtils from '../../utils/FileUtils'
import LanguageUtils from '../../utils/LanguageUtils'
import Linking from '../../annotationManagement/purposes/linking/Linking'
import Annotation from '../../annotationManagement/Annotation'
import Codebook from '../../codebook/model/Codebook'
import _ from 'lodash'
import HypothesisClientManager from '../../annotationServer/hypothesis/HypothesisClientManager'
import Events from '../../Events'
import { Relationship } from '../../contentScript/MapContentManager'
import ColorUtils from '../../utils/ColorUtils'

class CXLImporter {
  static askUserToImportCxlFile (callback) {
    // Ask user to upload the file
    Alerts.inputTextAlert({
      title: 'Upload your .cxl file',
      html: 'Here you can upload your cmap in the .cxl format.',
      input: 'file',
      callback: (err, file) => {
        if (err) {
          window.alert('An unexpected error happened when trying to load the alert.')
        } else {
          // Read cxl file
          FileUtils.readCXLFile(file, (err, cxlObject) => {
            if (err) {
              callback(new Error('Unable to read cxl file: ' + err.message))
            } else {
              callback(null, cxlObject)
            }
          })
        }
      }
    })
  }

  static askUserRootTheme (themes, title, focusQuestion, callback) {
    const focusQuestionTheme = themes.filter(theme => theme.name === focusQuestion)
    if (focusQuestionTheme) {
      callback(focusQuestion)
    } else {
      const showForm = () => {
        // Create form
        let html = ''
        const selectFrom = document.createElement('select')
        selectFrom.id = 'topicConcept'
        themes.forEach(theme => {
          const option = document.createElement('option')
          if (theme.topic !== '') {
            option.text = theme.topic
            option.value = theme.topic
          } else {
            option.text = theme.name
            option.value = theme.name
          }
          selectFrom.add(option)
        })
        html += 'Topic:' + selectFrom.outerHTML + '<br>'
        let topicConcept
        Alerts.multipleInputAlert({
          title: title || '',
          html: html,
          // position: Alerts.position.bottom, // TODO Must be check if it is better to show in bottom or not
          preConfirm: () => {
            topicConcept = document.querySelector('#topicConcept').value
          },
          callback: (err) => {
            if (err) {
              window.alert('An unexpected error happened when trying to load the alert.')
            } else {
              callback(topicConcept)
            }
          }
        })
      }
      showForm()
    }
  }

  static importCXLfile () {
    CXLImporter.askUserToImportCxlFile((err, cxlObject) => {
      if (err) {
        Alerts.errorAlert({ text: 'Unable to parse cxl file. Error:<br/>' + err.message })
      } else {
        let title, groupID, focusQuestion
        try {
          const titleElement = cxlObject.getElementsByTagName('dc:title')[0]
          title = titleElement.innerHTML
          const contributor = cxlObject.getElementsByTagName('dc:contributor')[0]
          const groupIDElement = contributor.getElementsByTagName('vcard:FN')[0]
          groupID = groupIDElement.innerHTML
          const focusQuestionElement = cxlObject.getElementsByTagName('dc:description')[0]
          focusQuestion = focusQuestionElement.innerHTML
        } catch (err) {
          title = ''
          groupID = ''
        }
        const restoredGroup = window.abwa.groupSelector.groups.filter(existingGroups => existingGroups.id === groupID)[0]
        // IF THE IMPORTED MAP DOES NOT EXIST
        if (!restoredGroup) {
          CXLImporter.createNewImportedCmap(cxlObject, title)
        } else {
          console.log('The map exist:' + restoredGroup.id)
          CXLImporter.updateImportedMap(cxlObject, restoredGroup)
        }
      }
    })
  }

  static importCXLfileFromCmapCloud (cxlObject) {
    let title, groupID, focusQuestion
    try {
      const titleElement = cxlObject.getElementsByTagName('dc:title')[0]
      title = titleElement.innerHTML
      const contributor = cxlObject.getElementsByTagName('dc:contributor')[0]
      const groupIDElement = contributor.getElementsByTagName('vcard:FN')[0]
      groupID = groupIDElement.innerHTML
      const focusQuestionElement = cxlObject.getElementsByTagName('dc:description')[0]
      focusQuestion = focusQuestionElement.innerHTML
    } catch (err) {
      title = ''
      groupID = ''
    }
    CXLImporter.retrieveGroups((err, groups) => {
      if (err) {
        Alerts.errorAlert({ text: 'Error finding groups' })
      } else {
        console.log(groups)
        const restoredGroup = groups.filter(existingGroups => existingGroups.id === groupID)[0]
        // IF THE IMPORTED MAP DOES NOT EXIST
        if (!restoredGroup) {
          CXLImporter.createNewImportedCmapFromCmapCloud(cxlObject, title)
        } else {
          console.log('The map exist:' + restoredGroup.id)
          CXLImporter.updateImportedMapFromCmapCloud(cxlObject, restoredGroup)
        }
      }
    })
  }

  static retrieveGroups (callback) {
    let retrieveGroups
    window.cag.annotationServerManager.client.getListOfGroups({}, (err, groups) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        retrieveGroups = groups
        // Remove public group in hypothes.is and modify group URL
        if (LanguageUtils.isInstanceOf(window.cag.annotationServerManager, HypothesisClientManager)) {
          _.remove(retrieveGroups, (group) => {
            return group.id === '__world__'
          })
          _.forEach(retrieveGroups, (group) => {
            if (_.has(group, 'links.html')) {
              group.links.html = group.links.html.substr(0, group.links.html.lastIndexOf('/'))
            }
          })
        }
        if (_.isFunction(callback)) {
          callback(null, retrieveGroups)
        }
      }
    })
  }

  static getConceptNameFromCXL (conceptList, id) {
    const concept = _.filter(conceptList.childNodes, (conceptNode) => {
      return conceptNode.getAttribute('id') === id
    })
    return concept[0].getAttribute('label')
  }

  static createNewImportedCmap (cxlObject, title) {
    let inputValue = title
    const focusQuestionElement = cxlObject.getElementsByTagName('dc:description')[0]
    const focusQuestion = focusQuestionElement.innerHTML
    if (focusQuestionElement || focusQuestion) {
      inputValue = focusQuestion
    }
    Alerts.inputTextAlert({
      alertType: Alerts.alertType.warning,
      title: 'You have imported a new concept map',
      text: 'When the configuration is imported a new highlighter is created. You can return to your other annotation codebooks using the sidebar.',
      inputPlaceholder: 'Type here the name of your new concept map...',
      inputValue: inputValue,
      preConfirm: (groupName) => {
        if (_.isString(groupName)) {
          if (groupName.length <= 0) {
            const swal = require('sweetalert2')
            swal.showValidationMessage('Name cannot be empty.')
          } else if (groupName.length > 25) {
            groupName = groupName.slice(0, 25)
            return groupName
          } else {
            return groupName
          }
        }
      },
      callback: (err, groupName) => {
        if (err) {
          window.alert('Unable to load alert. Unexpected error, please contact developer.')
        } else {
          window.abwa.annotationServerManager.client.createNewGroup({ name: groupName, description: 'A group created from a cxl file' }, (err, newGroup) => {
            if (err) {
              Alerts.errorAlert({ text: 'Unable to create a new annotation group. Error: ' + err.message })
            } else {
              const conceptList = cxlObject.getElementsByTagName('concept-list')[0]
              const conceptAppearanceList = cxlObject.getElementsByTagName('concept-appearance-list')[0]
              const dimensionsListElement = cxlObject.getElementsByTagName('dc:subject')[0]
              const dimensionsList = dimensionsListElement.innerHTML.split(';')
              const tempCodebook = Codebook.fromCXLFile(conceptList, dimensionsList, groupName, focusQuestion, conceptAppearanceList)
              window.abwa.groupSelector.groups.push(newGroup)
              Codebook.setAnnotationServer(newGroup.id, (annotationServer) => {
                tempCodebook.annotationServer = annotationServer
                const title = 'Which is the topic or focus question?'
                CXLImporter.askUserRootTheme(tempCodebook.themes, title, focusQuestion, (topicConceptName) => {
                  let topicThemeObject
                  topicThemeObject = _.filter(tempCodebook.themes, (theme) => {
                    return theme.topic === topicConceptName || theme.name === topicConceptName
                  })
                  topicThemeObject[0].isTopic = true
                  const annotations = tempCodebook.toAnnotations()
                  // Send create highlighter
                  window.abwa.annotationServerManager.client.createNewAnnotations(annotations, (err, codebookAnnotations) => {
                    if (err) {
                      Alerts.errorAlert({ text: 'Unable to create new group.' })
                    } else {
                      // Parse annotations and dispatch created codebook
                      Codebook.fromAnnotations(codebookAnnotations, (err, codebook) => {
                        if (err) {
                          Alerts.errorAlert({ text: 'Unable to create a codebook. Error: ' + err.message })
                        } else {
                          const linkingAnnotations = []
                          const linkingPhraseList = cxlObject.getElementsByTagName('linking-phrase-list')[0]
                          const connectionList = cxlObject.getElementsByTagName('connection-list')[0]
                          if (linkingPhraseList) {
                            for (let i = 0; i < linkingPhraseList.childNodes.length; i++) {
                              const linkingPhrase = linkingPhraseList.childNodes[i]
                              const linkingPhraseName = linkingPhrase.getAttribute('label')
                              const linkingPhraseId = linkingPhrase.getAttribute('id')
                              const fromConcepts = _.filter(connectionList.childNodes, (connectionNode) => {
                                return connectionNode.getAttribute('to-id') === linkingPhraseId
                              })
                              const toConcepts = _.filter(connectionList.childNodes, (connectionNode) => {
                                return connectionNode.getAttribute('from-id') === linkingPhraseId
                              })
                              for (let j = 0; j < fromConcepts.length; j++) {
                                const fromPreviousConceptId = fromConcepts[j].getAttribute('from-id')
                                const fromName = this.getConceptNameFromCXL(conceptList, fromPreviousConceptId)
                                for (let k = 0; k < toConcepts.length; k++) {
                                  const toPreviousConceptId = toConcepts[k].getAttribute('to-id')
                                  const toName = this.getConceptNameFromCXL(conceptList, toPreviousConceptId)
                                  // Tags information
                                  const tags = ['from' + ':' + fromName]
                                  tags.push('linkingWord:' + linkingPhraseName)
                                  tags.push('to:' + toName)
                                  const target = window.abwa.annotationManagement.annotationCreator.obtainTargetToCreateAnnotation({})
                                  // Body information
                                  const fromId = codebook.getThemeByName(fromName).id
                                  const toId = codebook.getThemeByName(toName).id
                                  if (fromId && toId && linkingPhraseName) {
                                    const body = []
                                    const value = {}
                                    value.from = fromId
                                    value.to = toId
                                    value.linkingWord = linkingPhraseName
                                    const linkingBody = new Linking({ value })
                                    body.push(linkingBody.serialize())
                                    const annotationToCreate = new Annotation({
                                      tags: tags,
                                      body: body,
                                      target: target,
                                      group: newGroup.id,
                                      permissions: { read: ['group:' + newGroup.id] }
                                    })
                                    linkingAnnotations.push(annotationToCreate.serialize())
                                  }
                                }
                              }
                            }
                          }
                          if (linkingAnnotations.length !== 0) {
                            window.abwa.annotationServerManager.client.createNewAnnotations(linkingAnnotations, (err, annotations) => {
                              if (err) {
                                Alerts.errorAlert({ text: 'Unable to import annotations. Error: ' + err.message })
                              } else {
                                window.abwa.groupSelector.retrieveGroups(() => {
                                  window.abwa.groupSelector.setCurrentGroup(newGroup.id, () => {
                                    window.abwa.sidebar.openSidebar()
                                    // Dispatch annotations updated
                                    Alerts.closeAlert()
                                  })
                                })
                              }
                            })
                          } else {
                            window.abwa.groupSelector.retrieveGroups(() => {
                              window.abwa.groupSelector.setCurrentGroup(newGroup.id, () => {
                                window.abwa.sidebar.openSidebar()
                                // Dispatch annotations updated
                                Alerts.closeAlert()
                              })
                            })
                          }
                        }
                      })
                    }
                  })
                })
              })
            }
          })
        }
      }
    })
  }

  static updateImportedMap (cxlObject, restoredGroup) {
    // IF THE IMPORTED MAP HAS AN EXISTING GROUP
    let focusQuestion
    const focusQuestionElement = cxlObject.getElementsByTagName('dc:description')[0]
    focusQuestion = focusQuestionElement.innerHTML
    window.abwa.groupSelector.updateCurrentGroupHandler(restoredGroup.id)
    const conceptList = cxlObject.getElementsByTagName('concept-list')[0]
    const conceptAppearanceList = cxlObject.getElementsByTagName('concept-appearance-list')[0]
    const dimensionsListElement = cxlObject.getElementsByTagName('dc:subject')[0]
    const dimensionsList = dimensionsListElement.innerHTML.split(';')
    const importedCodebook = Codebook.fromCXLFile(conceptList, dimensionsList, restoredGroup, focusQuestion, conceptAppearanceList)
    Codebook.setAnnotationServer(restoredGroup.id, (annotationServer) => {
      importedCodebook.annotationServer = annotationServer
      const title = 'Concept&Go has detected a version of this map. What was the topic or focus question?'
      CXLImporter.askUserRootTheme(importedCodebook.themes, title, focusQuestion, (topicConceptName) => {
        let topicThemeObject
        topicThemeObject = _.filter(importedCodebook.themes, (theme) => {
          return theme.topic === topicConceptName || theme.name === topicConceptName
        })
        topicThemeObject[0].isTopic = true
        window.abwa.annotationServerManager.client.searchAnnotations({
          url: 'https://hypothes.is/groups/' + restoredGroup.id,
          order: 'desc'
        }, (err, annotations) => {
          if (err) {
            Alerts.errorAlert({ text: 'Unable to construct the highlighter. Please reload webpage and try it again.' })
          } else {
            const codebookDefinitionAnnotations = annotations.filter(annotation => annotation.motivation === 'codebookDevelopment' || 'defining')
            Codebook.fromAnnotations(codebookDefinitionAnnotations, (err, previousCodebook) => {
              const miscThemeObject = _.filter(previousCodebook.themes, (theme) => {
                return theme.isMisc === true
              })
              importedCodebook.themes.push(miscThemeObject[0])
              const previousCodebookIDs = previousCodebook.themes.map(previousCodebookTheme => previousCodebookTheme.id)
              const previousCodebookNames = previousCodebook.themes.map(previousCodebookTheme => previousCodebookTheme.name)
              const importedCodebookIDs = importedCodebook.themes.map(importedCodebookTheme => importedCodebookTheme.id)
              const previousDimensionsIDs = previousCodebook.dimensions.map(previousCodebookDimensions => previousCodebookDimensions.id)
              const previousDimensionsNames = previousCodebook.dimensions.map(previousCodebookDimensions => previousCodebookDimensions.name)
              const importedDimensionsNames = importedCodebook.dimensions.map(importedCodebookDimensions => importedCodebookDimensions.name)
              const importedRelationships = []
              // construct relationships
              const linkingPhraseList = cxlObject.getElementsByTagName('linking-phrase-list')[0]
              const connectionList = cxlObject.getElementsByTagName('connection-list')[0]
              if (linkingPhraseList) {
                for (let i = 0; i < linkingPhraseList.childNodes.length; i++) {
                  const linkingPhrase = linkingPhraseList.childNodes[i]
                  const linkingPhraseName = linkingPhrase.getAttribute('label')
                  const linkingPhraseId = linkingPhrase.getAttribute('id')
                  const fromConcepts = _.filter(connectionList.childNodes, (connectionNode) => {
                    return connectionNode.getAttribute('to-id') === linkingPhraseId
                  })
                  const toConcepts = _.filter(connectionList.childNodes, (connectionNode) => {
                    return connectionNode.getAttribute('from-id') === linkingPhraseId
                  })
                  for (let j = 0; j < fromConcepts.length; j++) {
                    const fromPreviousConceptId = fromConcepts[j].getAttribute('from-id')
                    // let fromName = this.getConceptNameFromCXL(conceptList, fromPreviousConceptId)
                    for (let k = 0; k < toConcepts.length; k++) {
                      const toPreviousConceptId = toConcepts[k].getAttribute('to-id')
                      // let toName = this.getConceptNameFromCXL(conceptList, toPreviousConceptId)
                      const from = importedCodebook.getCodeOrThemeFromId(fromPreviousConceptId)
                      const to = importedCodebook.getCodeOrThemeFromId(toPreviousConceptId)
                      const newRelation = new Relationship(linkingPhraseId, from, to, linkingPhraseName, [])
                      importedRelationships.push(newRelation)
                    }
                  }
                }
              }
              const previousRelationships = window.abwa.mapContentManager.relationships
              const previousRelationshipsIDs = previousRelationships.map(previousRelationship => previousRelationship.id)
              const importedRelationshipsIDs = importedRelationships.map(importedRelationship => importedRelationship.id)
              console.log('previousRelationships')
              console.log(previousRelationships)
              console.log('importedRelationships')
              console.log(importedRelationships)
              if (err) {
                Alerts.errorAlert({ text: 'Error parsing codebook. Error: ' + err.message })
              } else {
                // NEW DIMENSIONS
                const dimensionsToInclude = importedCodebook.dimensions.filter(importedCodebookDimension => !(previousDimensionsNames.includes(importedCodebookDimension.name)))
                if (dimensionsToInclude[0]) {
                  dimensionsToInclude.forEach(dimensionToInclude => {
                    const newDimensionAnnotation = dimensionToInclude.toAnnotation()
                    window.abwa.annotationServerManager.client.createNewAnnotation(newDimensionAnnotation, (err, annotation) => {
                      if (err) {
                        Alerts.errorAlert({ text: 'Unable to create the new code. Error: ' + err.toString() })
                      } else {
                        LanguageUtils.dispatchCustomEvent(Events.dimensionCreated, { newDimensionAnnotation: annotation, target: event.detail.target })
                      }
                    })
                  })
                }
                // REMOVE DIMENSIONS
                const dimensionsToRemove = previousCodebook.dimensions.filter(previousCodebookDimension => !(importedDimensionsNames.includes(previousCodebookDimension.name)))
                dimensionsToRemove.forEach(dimensionToRemove => {
                  const annotationsToDelete = [dimensionToRemove.id]
                  window.abwa.annotationServerManager.client.deleteAnnotations(annotationsToDelete, (err, result) => {
                    if (err) {
                      Alerts.errorAlert({ text: 'Unexpected error when deleting the code.' })
                    } else {
                      LanguageUtils.dispatchCustomEvent(Events.dimensionRemoved, { dimension: dimensionToRemove })
                    }
                  })
                })
                // UPDATE DIMENSION FOR THEMES
                const maintainedDimensions = previousCodebook.dimensions.filter(previousCodebookDimension => importedDimensionsNames.includes(previousCodebookDimension.name))
                importedCodebook.themes.forEach(theme => {
                  if (!theme.isMisc) {
                    let themeColor = CXLImporter.getThemeColor(conceptAppearanceList, theme)
                    themeColor = ColorUtils.getColorFromCXLFormat(themeColor)
                    const dimension = maintainedDimensions.find((dim) => {
                      // Delete element 5 on first iteration
                      const dimColor = dim.color.replaceAll(' ', '')
                      return dimColor === themeColor
                    })
                    if (dimension) {
                      theme.dimension = dimension.name
                    }
                  }
                })
                // UPDATED THEMES
                const candidateThemesToUpdate = importedCodebook.themes.filter(importedCodebookTheme => previousCodebookIDs.includes(importedCodebookTheme.id))
                const themesToUpdate = candidateThemesToUpdate.filter(themeToUpdate => {
                  const elementToCompare = previousCodebook.themes.filter(previousCodebookTheme => previousCodebookTheme.id === themeToUpdate.id)
                  return !(themeToUpdate.name === elementToCompare[0].name) || !(themeToUpdate.dimension === elementToCompare[0].dimension)
                })
                console.log(themesToUpdate)
                if (themesToUpdate[0]) {
                  themesToUpdate.forEach(themeToUpdate => {
                    const oldTheme = previousCodebook.themes.find(theme => { return theme.id === themesToUpdate.id })
                    window.abwa.codebookManager.codebookUpdater.updateCodebookTheme(themeToUpdate)
                    // Update all annotations done with this theme
                    window.abwa.codebookManager.codebookUpdater.updateAnnotationsWithTheme(oldTheme, themeToUpdate)
                  })
                }
              }
              // INCLUDE NEW THEMES
              let themesToInclude = importedCodebook.themes.filter(importedCodebookTheme => !(previousCodebookIDs.includes(importedCodebookTheme.id)))
              if (themesToInclude[0]) {
                themesToInclude = themesToInclude.filter(importedCodebookTheme => !(previousCodebookNames.includes(importedCodebookTheme.name)))
                console.log(themesToInclude)
                if (themesToInclude[0]) {
                  themesToInclude.forEach(themeToInclude => {
                    const newThemeAnnotation = themeToInclude.toAnnotation()
                    window.abwa.annotationServerManager.client.createNewAnnotation(newThemeAnnotation, (err, annotation) => {
                      if (err) {
                        Alerts.errorAlert({ text: 'Unable to create the new code. Error: ' + err.toString() })
                      } else {
                        LanguageUtils.dispatchCustomEvent(Events.themeCreated, { newThemeAnnotation: annotation, target: event.detail.target })
                      }
                    })
                  })
                }
              }
              // REMOVE OLD THEMES
              const themesToRemove = previousCodebook.themes.filter(previousCodebookTheme => !(importedCodebookIDs.includes(previousCodebookTheme.id)))
              console.log(themesToRemove)
              themesToRemove.forEach(themeToRemove => {
                const annotationsToDelete = [themeToRemove.id]
                window.abwa.annotationServerManager.client.deleteAnnotations(annotationsToDelete, (err, result) => {
                  if (err) {
                    Alerts.errorAlert({ text: 'Unexpected error when deleting the code.' })
                  } else {
                    LanguageUtils.dispatchCustomEvent(Events.themeRemoved, { theme: themeToRemove })
                  }
                })
              })
              // UPDATED RELATIONSHIPS
              const candidateRelationshipsToUpdate = importedRelationships.filter(importedRelationship => previousRelationshipsIDs.includes(importedRelationship.id))
              let newRelationships
              const relationshipsToUpdate = candidateRelationshipsToUpdate.filter(relationshipToUpdate => {
                const elementsToCompare = previousRelationships.filter(previousRelationship => previousRelationship.id === relationshipToUpdate.id)
                if (elementsToCompare.length > 1) {
                  console.log('problems:' + elementsToCompare)
                }
                const elementToCompare = elementsToCompare[0]
                return !(relationshipToUpdate.fromConcept.id === elementToCompare.fromConcept.id) || !(relationshipToUpdate.toConcept.id === elementToCompare.toConcept.id) || !(relationshipToUpdate.linkingWord === elementToCompare.linkingWord)
              })
              console.log(relationshipsToUpdate)
              // INCLUDE NEW RELATIONSHIPS
              let relationshipsToInclude = importedRelationships.filter(importedRelationship => !(previousRelationshipsIDs.includes(importedRelationship.id)))
              console.log(relationshipsToInclude)
              relationshipsToInclude = relationshipsToInclude.concat(relationshipsToUpdate)
              if (relationshipsToInclude[0]) {
                relationshipsToInclude.forEach(relationshipToInclude => {
                  const tags = ['from' + ':' + relationshipToInclude.fromTheme.name]
                  tags.push('linkingWord:' + relationshipToInclude.linkingWord)
                  tags.push('to:' + relationshipToInclude.toTheme.name)
                  LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
                    purpose: 'linking',
                    tags: tags,
                    from: relationshipToInclude.fromTheme.id,
                    to: relationshipToInclude.toTheme.id,
                    linkingWord: relationshipToInclude.linkingWord
                  })
                })
              }
              // REMOVE OLD RELATIONSHIPS
              const relationshipsToRemove = previousRelationships.filter(previousRelationship => !(importedRelationshipsIDs.includes(previousRelationship.id)))
              console.log(relationshipsToRemove)
              if (relationshipsToRemove[0]) {
                let annotationsToDelete = []
                relationshipsToRemove.forEach(relationship => {
                  annotationsToDelete = annotationsToDelete.concat(relationship.evidenceAnnotations)
                })
                const annotationsToDeleteIDs = annotationsToDelete.map(annotationToDelete => annotationToDelete.id)
                if (annotationsToDeleteIDs[0]) {
                  window.abwa.annotationServerManager.client.deleteAnnotations(annotationsToDeleteIDs, (err, result) => {
                    if (err) {
                      Alerts.errorAlert({ text: 'Unexpected error when deleting the code.' })
                    }
                  })
                }
              }
              Alerts.simpleSuccessAlert({ text: 'Concept map succesfully uploaded. Refresh the page!' })
              window.abwa.groupSelector.retrieveGroups(() => {
                window.abwa.groupSelector.setCurrentGroup(restoredGroup.id, () => {
                  window.abwa.sidebar.openSidebar()
                  // Dispatch annotations updated
                  Alerts.closeAlert()
                })
              })
            })
          }
        })
      })
    })
  }

  static getThemeColor (conceptAppearanceList, theme) {
    if (conceptAppearanceList.childNodes) {
      conceptAppearanceList = Array.from(conceptAppearanceList.children)
    }
    const concept = _.filter(conceptAppearanceList, (conceptNode) => {
      return conceptNode.getAttribute('id') === theme.id
    })
    if (concept) {
      const backgroundColor = concept[0].getAttribute('background-color')
      if (backgroundColor) {
        return backgroundColor
      } else {
        return null
      }
    } else {
      return null
    }
  }

  static isDimension (conceptAppearanceList, elementID) {
    const concept = _.filter(conceptAppearanceList, (conceptNode) => {
      return conceptNode.getAttribute('id') === elementID
    })
    if (concept) {
      const fontStyle = concept[0].getAttribute('font-style')
      if (fontStyle) {
        if (fontStyle === 'italic|bold' || fontStyle === 'bold|italic') {
          return true
        } else {
          return false
        }
      } else {
        return false
      }
    } else {
      return false
    }
  }

  static createNewImportedCmapFromCmapCloud (cxlObject, title) {
    let inputValue = title
    const focusQuestionElement = cxlObject.getElementsByTagName('dc:description')[0]
    const focusQuestion = focusQuestionElement.innerHTML
    if (focusQuestionElement || focusQuestion) {
      inputValue = focusQuestion
    }
    Alerts.inputTextAlert({
      alertType: Alerts.alertType.warning,
      title: 'You have imported a new concept map',
      text: 'When the configuration is imported a new highlighter is created. You can return to your other annotation codebooks using the sidebar.',
      inputPlaceholder: 'Type here the name of your new concept map...',
      inputValue: inputValue,
      preConfirm: (groupName) => {
        if (_.isString(groupName)) {
          if (groupName.length <= 0) {
            const swal = require('sweetalert2')
            swal.showValidationMessage('Name cannot be empty.')
          } else if (groupName.length > 25) {
            groupName = groupName.slice(0, 25)
            return groupName
          } else {
            return groupName
          }
        }
      },
      callback: (err, groupName) => {
        if (err) {
          window.alert('Unable to load alert. Unexpected error, please contact developer.')
        } else {
          window.cag.annotationServerManager.client.createNewGroup({ name: groupName, description: 'A group created from a cxl file' }, (err, newGroup) => {
            if (err) {
              Alerts.errorAlert({ text: 'Unable to create a new annotation group. Error: ' + err.message })
            } else {
              const conceptList = cxlObject.getElementsByTagName('concept-list')[0]
              const conceptAppearanceList = cxlObject.getElementsByTagName('concept-appearance-list')[0]
              const dimensionsListElement = cxlObject.getElementsByTagName('dc:subject')[0]
              const dimensionsList = dimensionsListElement.innerHTML.split(';')
              const tempCodebook = Codebook.fromCXLFile(conceptList, dimensionsList, groupName, focusQuestion, conceptAppearanceList)
              // window.abwa.groupSelector.groups.push(newGroup)
              Codebook.setAnnotationServer(newGroup.id, (annotationServer) => {
                tempCodebook.annotationServer = annotationServer
                const title = 'Which is the topic or focus question?'
                CXLImporter.askUserRootTheme(tempCodebook.themes, title, focusQuestion, (topicConceptName) => {
                  let topicThemeObject
                  topicThemeObject = _.filter(tempCodebook.themes, (theme) => {
                    return theme.topic === topicConceptName || theme.name === topicConceptName
                  })
                  topicThemeObject[0].isTopic = true
                  const annotations = tempCodebook.toAnnotations()
                  // Send create highlighter
                  window.cag.annotationServerManager.client.createNewAnnotations(annotations, (err, codebookAnnotations) => {
                    if (err) {
                      Alerts.errorAlert({ text: 'Unable to create new group.' })
                    } else {
                      // Parse annotations and dispatch created codebook
                      Codebook.fromAnnotations(codebookAnnotations, (err, codebook) => {
                        if (err) {
                          Alerts.errorAlert({ text: 'Unable to create a codebook. Error: ' + err.message })
                        } else {
                          const linkingAnnotations = []
                          const linkingPhraseList = cxlObject.getElementsByTagName('linking-phrase-list')[0]
                          const connectionList = cxlObject.getElementsByTagName('connection-list')[0]
                          if (linkingPhraseList) {
                            for (let i = 0; i < linkingPhraseList.childNodes.length; i++) {
                              const linkingPhrase = linkingPhraseList.childNodes[i]
                              const linkingPhraseName = linkingPhrase.getAttribute('label')
                              const linkingPhraseId = linkingPhrase.getAttribute('id')
                              const fromConcepts = _.filter(connectionList.childNodes, (connectionNode) => {
                                return connectionNode.getAttribute('to-id') === linkingPhraseId
                              })
                              const toConcepts = _.filter(connectionList.childNodes, (connectionNode) => {
                                return connectionNode.getAttribute('from-id') === linkingPhraseId
                              })
                              for (let j = 0; j < fromConcepts.length; j++) {
                                const fromPreviousConceptId = fromConcepts[j].getAttribute('from-id')
                                const fromName = this.getConceptNameFromCXL(conceptList, fromPreviousConceptId)
                                for (let k = 0; k < toConcepts.length; k++) {
                                  const toPreviousConceptId = toConcepts[k].getAttribute('to-id')
                                  const toName = this.getConceptNameFromCXL(conceptList, toPreviousConceptId)
                                  // Tags information
                                  const tags = ['from' + ':' + fromName]
                                  tags.push('linkingWord:' + linkingPhraseName)
                                  tags.push('to:' + toName)
                                  const target = window.abwa.annotationManagement.annotationCreator.obtainTargetToCreateAnnotation({})
                                  // Body information
                                  const fromId = codebook.getThemeByName(fromName).id
                                  const toId = codebook.getThemeByName(toName).id
                                  if (fromId && toId && linkingPhraseName) {
                                    const body = []
                                    const value = {}
                                    value.from = fromId
                                    value.to = toId
                                    value.linkingWord = linkingPhraseName
                                    const linkingBody = new Linking({ value })
                                    body.push(linkingBody.serialize())
                                    const annotationToCreate = new Annotation({
                                      tags: tags,
                                      body: body,
                                      target: target,
                                      group: newGroup.id,
                                      permissions: { read: ['group:' + newGroup.id] }
                                    })
                                    linkingAnnotations.push(annotationToCreate.serialize())
                                  }
                                }
                              }
                            }
                          }
                          if (linkingAnnotations.length !== 0) {
                            window.cag.annotationServerManager.client.createNewAnnotations(linkingAnnotations, (err, annotations) => {
                              if (err) {
                                Alerts.errorAlert({ text: 'Unable to import annotations. Error: ' + err.message })
                              } else {
                                Alerts.infoAlert({ text: 'Cmap Imported' })
                              }
                            })
                          } else {
                            Alerts.infoAlert({ text: 'Cmap Imported' })
                          }
                        }
                      })
                    }
                  })
                })
              })
            }
          })
        }
      }
    })
  }

  static updateImportedMapFromCmapCloud (cxlObject, restoredGroup) {
    // IF THE IMPORTED MAP HAS AN EXISTING GROUP
    let focusQuestion
    const focusQuestionElement = cxlObject.getElementsByTagName('dc:description')[0]
    focusQuestion = focusQuestionElement.innerHTML
    // window.abwa.groupSelector.updateCurrentGroupHandler(restoredGroup.id)
    const conceptList = cxlObject.getElementsByTagName('concept-list')[0]
    const conceptAppearanceList = cxlObject.getElementsByTagName('concept-appearance-list')[0]
    const dimensionsListElement = cxlObject.getElementsByTagName('dc:subject')[0]
    const dimensionsList = dimensionsListElement.innerHTML.split(';')
    const importedCodebook = Codebook.fromCXLFile(conceptList, dimensionsList, restoredGroup, focusQuestion, conceptAppearanceList)
    Codebook.setAnnotationServer(restoredGroup.id, (annotationServer) => {
      importedCodebook.annotationServer = annotationServer
      const title = 'Concept&Go has detected a version of this map. What was the topic or focus question?'
      CXLImporter.askUserRootTheme(importedCodebook.themes, title, focusQuestion, (topicConceptName) => {
        let topicThemeObject
        topicThemeObject = _.filter(importedCodebook.themes, (theme) => {
          return theme.topic === topicConceptName || theme.name === topicConceptName
        })
        topicThemeObject[0].isTopic = true
        window.cag.annotationServerManager.client.searchAnnotations({
          url: 'https://hypothes.is/groups/' + restoredGroup.id,
          order: 'desc'
        }, (err, annotations) => {
          if (err) {
            Alerts.errorAlert({ text: 'Unable to construct the highlighter. Please reload webpage and try it again.' })
          } else {
            const codebookDefinitionAnnotations = annotations.filter(annotation => annotation.motivation === 'codebookDevelopment' || 'defining')
            Codebook.fromAnnotations(codebookDefinitionAnnotations, (err, previousCodebook) => {
              const miscThemeObject = _.filter(previousCodebook.themes, (theme) => {
                return theme.isMisc === true
              })
              importedCodebook.themes.push(miscThemeObject[0])
              const previousCodebookIDs = previousCodebook.themes.map(previousCodebookTheme => previousCodebookTheme.id)
              const previousCodebookNames = previousCodebook.themes.map(previousCodebookTheme => previousCodebookTheme.name)
              const importedCodebookIDs = importedCodebook.themes.map(importedCodebookTheme => importedCodebookTheme.id)
              const previousDimensionsIDs = previousCodebook.dimensions.map(previousCodebookDimensions => previousCodebookDimensions.id)
              const previousDimensionsNames = previousCodebook.dimensions.map(previousCodebookDimensions => previousCodebookDimensions.name)
              const importedDimensionsNames = importedCodebook.dimensions.map(importedCodebookDimensions => importedCodebookDimensions.name)
              const importedRelationships = []
              // construct relationships
              const linkingPhraseList = cxlObject.getElementsByTagName('linking-phrase-list')[0]
              const connectionList = cxlObject.getElementsByTagName('connection-list')[0]
              if (linkingPhraseList) {
                for (let i = 0; i < linkingPhraseList.childNodes.length; i++) {
                  const linkingPhrase = linkingPhraseList.childNodes[i]
                  const linkingPhraseName = linkingPhrase.getAttribute('label')
                  const linkingPhraseId = linkingPhrase.getAttribute('id')
                  const fromConcepts = _.filter(connectionList.childNodes, (connectionNode) => {
                    return connectionNode.getAttribute('to-id') === linkingPhraseId
                  })
                  const toConcepts = _.filter(connectionList.childNodes, (connectionNode) => {
                    return connectionNode.getAttribute('from-id') === linkingPhraseId
                  })
                  for (let j = 0; j < fromConcepts.length; j++) {
                    const fromPreviousConceptId = fromConcepts[j].getAttribute('from-id')
                    // let fromName = this.getConceptNameFromCXL(conceptList, fromPreviousConceptId)
                    for (let k = 0; k < toConcepts.length; k++) {
                      const toPreviousConceptId = toConcepts[k].getAttribute('to-id')
                      // let toName = this.getConceptNameFromCXL(conceptList, toPreviousConceptId)
                      const from = importedCodebook.getCodeOrThemeFromId(fromPreviousConceptId)
                      const to = importedCodebook.getCodeOrThemeFromId(toPreviousConceptId)
                      const newRelation = new Relationship(linkingPhraseId, from, to, linkingPhraseName, [])
                      importedRelationships.push(newRelation)
                    }
                  }
                }
              }
              // TODO
              const previousRelationships = []
              const previousRelationshipsIDs = previousRelationships.map(previousRelationship => previousRelationship.id)
              const importedRelationshipsIDs = importedRelationships.map(importedRelationship => importedRelationship.id)
              console.log('previousRelationships')
              console.log(previousRelationships)
              console.log('importedRelationships')
              console.log(importedRelationships)
              if (err) {
                Alerts.errorAlert({ text: 'Error parsing codebook. Error: ' + err.message })
              } else {
                // NEW DIMENSIONS
                const dimensionsToInclude = importedCodebook.dimensions.filter(importedCodebookDimension => !(previousDimensionsNames.includes(importedCodebookDimension.name)))
                if (dimensionsToInclude[0]) {
                  dimensionsToInclude.forEach(dimensionToInclude => {
                    const newDimensionAnnotation = dimensionToInclude.toAnnotation()
                    window.cag.annotationServerManager.client.createNewAnnotation(newDimensionAnnotation, (err, annotation) => {
                      if (err) {
                        Alerts.errorAlert({ text: 'Unable to create the new code. Error: ' + err.toString() })
                      } else {
                        LanguageUtils.dispatchCustomEvent(Events.dimensionCreated, { newDimensionAnnotation: annotation, target: event.detail.target })
                      }
                    })
                  })
                }
                // REMOVE DIMENSIONS
                const dimensionsToRemove = previousCodebook.dimensions.filter(previousCodebookDimension => !(importedDimensionsNames.includes(previousCodebookDimension.name)))
                dimensionsToRemove.forEach(dimensionToRemove => {
                  const annotationsToDelete = [dimensionToRemove.id]
                  window.cag.annotationServerManager.client.deleteAnnotations(annotationsToDelete, (err, result) => {
                    if (err) {
                      Alerts.errorAlert({ text: 'Unexpected error when deleting the code.' })
                    } else {
                      LanguageUtils.dispatchCustomEvent(Events.dimensionRemoved, { dimension: dimensionToRemove })
                    }
                  })
                })
                // UPDATE DIMENSION FOR THEMES
                const maintainedDimensions = previousCodebook.dimensions.filter(previousCodebookDimension => importedDimensionsNames.includes(previousCodebookDimension.name))
                importedCodebook.themes.forEach(theme => {
                  if (!theme.isMisc) {
                    let themeColor = CXLImporter.getThemeColor(conceptAppearanceList, theme)
                    themeColor = ColorUtils.getColorFromCXLFormat(themeColor)
                    const dimension = maintainedDimensions.find((dim) => {
                      // Delete element 5 on first iteration
                      const dimColor = dim.color.replaceAll(' ', '')
                      return dimColor === themeColor
                    })
                    if (dimension) {
                      theme.dimension = dimension.name
                    }
                  }
                })
                // UPDATED THEMES
                const candidateThemesToUpdate = importedCodebook.themes.filter(importedCodebookTheme => previousCodebookIDs.includes(importedCodebookTheme.id))
                const themesToUpdate = candidateThemesToUpdate.filter(themeToUpdate => {
                  const elementToCompare = previousCodebook.themes.filter(previousCodebookTheme => previousCodebookTheme.id === themeToUpdate.id)
                  return !(themeToUpdate.name === elementToCompare[0].name) || !(themeToUpdate.dimension === elementToCompare[0].dimension)
                })
                console.log(themesToUpdate)
                if (themesToUpdate[0]) {
                  themesToUpdate.forEach(themeToUpdate => {
                    const oldTheme = previousCodebook.themes.find(theme => { return theme.id === themesToUpdate.id })
                    // TODO
                    // window.abwa.codebookManager.codebookUpdater.updateCodebookTheme(themeToUpdate)
                    // Update all annotations done with this theme
                    // window.abwa.codebookManager.codebookUpdater.updateAnnotationsWithTheme(oldTheme, themeToUpdate)
                  })
                }
              }
              // INCLUDE NEW THEMES
              let themesToInclude = importedCodebook.themes.filter(importedCodebookTheme => !(previousCodebookIDs.includes(importedCodebookTheme.id)))
              if (themesToInclude[0]) {
                themesToInclude = themesToInclude.filter(importedCodebookTheme => !(previousCodebookNames.includes(importedCodebookTheme.name)))
                console.log(themesToInclude)
                if (themesToInclude[0]) {
                  themesToInclude.forEach(themeToInclude => {
                    const newThemeAnnotation = themeToInclude.toAnnotation()
                    window.cag.annotationServerManager.client.createNewAnnotation(newThemeAnnotation, (err, annotation) => {
                      if (err) {
                        Alerts.errorAlert({ text: 'Unable to create the new code. Error: ' + err.toString() })
                      } else {
                        LanguageUtils.dispatchCustomEvent(Events.themeCreated, { newThemeAnnotation: annotation, target: event.detail.target })
                      }
                    })
                  })
                }
              }
              // REMOVE OLD THEMES
              const themesToRemove = previousCodebook.themes.filter(previousCodebookTheme => !(importedCodebookIDs.includes(previousCodebookTheme.id)))
              console.log(themesToRemove)
              themesToRemove.forEach(themeToRemove => {
                const annotationsToDelete = [themeToRemove.id]
                window.cag.annotationServerManager.client.deleteAnnotations(annotationsToDelete, (err, result) => {
                  if (err) {
                    Alerts.errorAlert({ text: 'Unexpected error when deleting the code.' })
                  } else {
                    LanguageUtils.dispatchCustomEvent(Events.themeRemoved, { theme: themeToRemove })
                  }
                })
              })
              // UPDATED RELATIONSHIPS
              const candidateRelationshipsToUpdate = importedRelationships.filter(importedRelationship => previousRelationshipsIDs.includes(importedRelationship.id))
              let newRelationships
              const relationshipsToUpdate = candidateRelationshipsToUpdate.filter(relationshipToUpdate => {
                const elementsToCompare = previousRelationships.filter(previousRelationship => previousRelationship.id === relationshipToUpdate.id)
                if (elementsToCompare.length > 1) {
                  console.log('problems:' + elementsToCompare)
                }
                const elementToCompare = elementsToCompare[0]
                return !(relationshipToUpdate.fromConcept.id === elementToCompare.fromConcept.id) || !(relationshipToUpdate.toConcept.id === elementToCompare.toConcept.id) || !(relationshipToUpdate.linkingWord === elementToCompare.linkingWord)
              })
              console.log(relationshipsToUpdate)
              // INCLUDE NEW RELATIONSHIPS
              let relationshipsToInclude = importedRelationships.filter(importedRelationship => !(previousRelationshipsIDs.includes(importedRelationship.id)))
              console.log(relationshipsToInclude)
              relationshipsToInclude = relationshipsToInclude.concat(relationshipsToUpdate)
              if (relationshipsToInclude[0]) {
                relationshipsToInclude.forEach(relationshipToInclude => {
                  const tags = ['from' + ':' + relationshipToInclude.fromTheme.name]
                  tags.push('linkingWord:' + relationshipToInclude.linkingWord)
                  tags.push('to:' + relationshipToInclude.toTheme.name)
                  LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
                    purpose: 'linking',
                    tags: tags,
                    from: relationshipToInclude.fromTheme.id,
                    to: relationshipToInclude.toTheme.id,
                    linkingWord: relationshipToInclude.linkingWord
                  })
                })
              }
              // REMOVE OLD RELATIONSHIPS
              const relationshipsToRemove = previousRelationships.filter(previousRelationship => !(importedRelationshipsIDs.includes(previousRelationship.id)))
              console.log(relationshipsToRemove)
              if (relationshipsToRemove[0]) {
                let annotationsToDelete = []
                relationshipsToRemove.forEach(relationship => {
                  annotationsToDelete = annotationsToDelete.concat(relationship.evidenceAnnotations)
                })
                const annotationsToDeleteIDs = annotationsToDelete.map(annotationToDelete => annotationToDelete.id)
                if (annotationsToDeleteIDs[0]) {
                  window.cag.annotationServerManager.client.deleteAnnotations(annotationsToDeleteIDs, (err, result) => {
                    if (err) {
                      Alerts.errorAlert({ text: 'Unexpected error when deleting the code.' })
                    }
                  })
                }
              }
              Alerts.simpleSuccessAlert({ text: 'Concept map succesfully uploaded. Refresh the page!' })
              Alerts.infoAlert({ text: 'IMPORTED.' })
            })
          }
        })
      })
    })
  }
}

export default CXLImporter
