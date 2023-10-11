import Alerts from '../../utils/Alerts'
import LanguageUtils from '../../utils/LanguageUtils'
import Codebook from '../../codebook/model/Codebook'
import _ from 'lodash'
import Events from '../../Events'
import { Relationship } from '../../contentScript/MapContentManager'
import ColorUtils from '../../utils/ColorUtils'
import CXLImporter from './CXLImporter'

class CXLMerger {
  static mergeCXLfile (cxlObject) {
    let groupID
    try {
      const contributor = cxlObject.getElementsByTagName('dc:contributor')[0]
      const groupIDElement = contributor.getElementsByTagName('vcard:FN')[0]
      groupID = groupIDElement.innerHTML
    } catch (err) {
      groupID = ''
    }
    const restoredGroup = window.abwa.groupSelector.groups.filter(existingGroups => existingGroups.id === groupID)[0]
    // IF THE IMPORTED MAP DOES NOT EXIST
    if (!restoredGroup) {
      Alerts.errorAlert({ text: 'There is not a map for this annotation group' })
    } else {
      console.log('The map exist:' + restoredGroup.id)
      CXLMerger.mergeCXL(cxlObject, restoredGroup)
    }
  }

  static mergeCXL (cxlObject, restoredGroup) {
    // IF THE IMPORTED MAP HAS AN EXISTING GROUP
    const focusQuestionElement = cxlObject.getElementsByTagName('dc:description')[0]
    const focusQuestion = focusQuestionElement.innerHTML
    window.abwa.groupSelector.updateCurrentGroupHandler(restoredGroup.id)
    const conceptList = cxlObject.getElementsByTagName('concept-list')[0]
    const conceptAppearanceList = cxlObject.getElementsByTagName('concept-appearance-list')[0]
    const dimensionsListElement = cxlObject.getElementsByTagName('dc:subject')[0]
    const dimensionsList = dimensionsListElement.innerHTML.split(';')
    const urlListElement = cxlObject.getElementsByTagName('dc:language')[0]
    const importedCodebook = Codebook.fromCXLFile(conceptList, dimensionsList, restoredGroup, focusQuestion, conceptAppearanceList, urlListElement.innerHTML)
    Codebook.setAnnotationServer(restoredGroup.id, (annotationServer) => {
      importedCodebook.annotationServer = annotationServer
      const title = 'Concept&Go has detected a version of this map. What was the topic or focus question?'
      CXLImporter.askUserRootTheme(importedCodebook.themes, title, focusQuestion, (topicConceptName) => {
        const topicThemeObject = _.filter(importedCodebook.themes, (theme) => {
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
              // const previousDimensionsIDs = previousCodebook.dimensions.map(previousCodebookDimensions => previousCodebookDimensions.id)
              const previousDimensionsNames = previousCodebook.dimensions.map(previousCodebookDimensions => previousCodebookDimensions.name)
              const importedDimensionsNames = importedCodebook.dimensions.map(importedCodebookDimensions => importedCodebookDimensions.name)
              let importedRelationships = []
              // construct relationships
              let linkingPhraseList = cxlObject.getElementsByTagName('linking-phrase-list')[0]
              let connectionList = cxlObject.getElementsByTagName('connection-list')[0]
              if (linkingPhraseList && linkingPhraseList.children) {
                linkingPhraseList = Array.from(linkingPhraseList.children)
              }
              if (connectionList && connectionList.children) {
                connectionList = Array.from(connectionList.children)
              }
              if (linkingPhraseList && connectionList) {
                for (let i = 0; i < linkingPhraseList.length; i++) {
                  const linkingPhrase = linkingPhraseList[i]
                  const linkingPhraseName = linkingPhrase.getAttribute('label')
                  const linkingPhraseId = linkingPhrase.getAttribute('id')
                  const fromConcepts = _.filter(connectionList, (connectionNode) => {
                    return connectionNode.getAttribute('to-id') === linkingPhraseId
                  })
                  const toConcepts = _.filter(connectionList, (connectionNode) => {
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
              importedRelationships = importedRelationships.filter((relationship) => {
                return (relationship.fromConcept !== null && relationship.toConcept !== null)
              })
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
                        LanguageUtils.dispatchCustomEvent(Events.dimensionCreated, {
                          newDimensionAnnotation: annotation,
                          target: event.detail.target
                        })
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
                    } else {
                      theme.dimension = 'misc'
                      // const annotation = theme.toAnnotation
                    }
                  }
                })
                // UPDATED THEMES
                const candidateThemesToUpdate = importedCodebook.themes.filter(importedCodebookTheme => previousCodebookIDs.includes(importedCodebookTheme.id))
                const themesToUpdate = candidateThemesToUpdate.filter(themeToUpdate => {
                  const elementToCompare = previousCodebook.themes.filter(previousCodebookTheme => previousCodebookTheme.id === themeToUpdate.id)
                  return (!(themeToUpdate.name === elementToCompare[0].name) || !(themeToUpdate.dimension === elementToCompare[0].dimension)) && !themeToUpdate.isTopic
                })
                console.log(themesToUpdate)
                if (themesToUpdate[0]) {
                  themesToUpdate.forEach(themeToUpdate => {
                    const oldTheme = previousCodebook.themes.filter(previousCodebookTheme => previousCodebookTheme.id === themeToUpdate.id)
                    window.abwa.codebookManager.codebookUpdater.updateCodebookTheme(themeToUpdate)
                    // Update all annotations done with this theme
                    window.abwa.codebookManager.codebookUpdater.updateAnnotationsWithTheme(oldTheme[0], themeToUpdate)
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
                    if (themeToInclude.name !== focusQuestion) {
                      window.abwa.codebookManager.codebookReader.codebook.addTheme(themeToInclude)
                      const newThemeAnnotation = themeToInclude.toAnnotation()
                      window.abwa.annotationServerManager.client.createNewAnnotation(newThemeAnnotation, (err, annotation) => {
                        if (err) {
                          Alerts.errorAlert({ text: 'Unable to create the new code. Error: ' + err.toString() })
                        } else {
                          const target = [{}]
                          const source = {}
                          // Get document title
                          source.title = 'https://cmapcloud.ihmc.us/cmaps/myCmaps.html'
                          target[0].source = source // Add source to the target
                          LanguageUtils.dispatchCustomEvent(Events.themeCreated, {
                            newThemeAnnotation: annotation,
                            target: target
                          })
                        }
                      })
                    }
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
                  const tags = ['from' + ':' + relationshipToInclude.fromConcept.name]
                  tags.push('linkingWord:' + relationshipToInclude.linkingWord)
                  tags.push('to:' + relationshipToInclude.toConcept.name)
                  const fromConcept = window.abwa.codebookManager.codebookReader.codebook.themes(theme => theme.id === relationshipToInclude.fromConcept.id)
                  const toConcept = window.abwa.codebookManager.codebookReader.codebook.themes(theme => theme.id === relationshipToInclude.toConcept.id)
                  if (fromConcept && toConcept) {
                    LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
                      purpose: 'linking',
                      tags: tags,
                      from: relationshipToInclude.fromConcept.id,
                      to: relationshipToInclude.toConcept.id,
                      linkingWord: relationshipToInclude.linkingWord
                    })
                  }
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
}

export default CXLMerger
