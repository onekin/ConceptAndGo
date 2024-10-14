import HypothesisClientManager from './annotationServer/hypothesis/HypothesisClientManager'
import _ from 'lodash'
import LanguageUtils from './utils/LanguageUtils'
import Alerts from './utils/Alerts'
import Config from './Config'
import CXLImporter from './importExport/cmap/CXLImporter'
// import swal from 'sweetalert2'
import Codebook from './codebook/model/Codebook'
import { CXLExporter } from './importExport/cmap/CXLExporter'
import CmapCloudClient from './importExport/cmap/cmapCloud/CmapCloudClient'
import ColorUtils from './utils/ColorUtils'
let noteOpened = false

const kudeatzaileakHasieratu = function () {
  const checkDOM = setInterval(function () {
    let noteOpened = false
    window.cag = {}
    window.cag.annotations = []
    window.cag.codebookAnnotations = []
    window.cag.annotationServerManager = new HypothesisClientManager()
    window.cag.annotationServerManager.init((err) => {
      if (err) {
        window.open(chrome.runtime.getURL('pages/options.html#cmapCloudConfiguration'))
      } else {
        window.cag.annotationServerManager.isLoggedIn((err, result) => {
          if (err || !result) {
            if (LanguageUtils.isInstanceOf(window.cag.annotationServerManager, HypothesisClientManager)) {
              window.open(chrome.runtime.getURL('pages/options.html#cmapCloudConfiguration'))
            }
          } else {
            const listElement = document.querySelector('li > a#create-url-res')
            if (listElement) {
              const newListElement = document.createElement('li')
              const aElement = document.createElement('a')
              aElement.style.fontSize = '12px'
              aElement.style.lineHeight = '14px'
              aElement.style.color = '#4682b4'
              aElement.id = 'conceptGoLabel'
              aElement.innerText = 'New annotation-driven Cmap'
              aElement.style.fontWeight = 'normal'
              aElement.addEventListener('click', () => {
                chrome.runtime.sendMessage({ scope: 'cmapCloud', cmd: 'getUserData' }, (response) => {
                  if (response.data) {
                    const data = response.data
                    if (data.userData.user && data.userData.password && data.userData.uid) {
                      const cmapCloudClient = new CmapCloudClient(data.userData.user, data.userData.password, data.userData.uid)
                      console.log('createTask')
                      // createTask()
                      createWindow(cmapCloudClient, data.userData)
                    } else {
                      let callback = () => {
                        window.open(chrome.runtime.getURL('pages/options.html#cmapCloudConfiguration'))
                      }
                      Alerts.infoAlert({
                        text: 'Please, provide us your Cmap Cloud login credentials in the configuration page of the Web extension.',
                        title: 'We need your Cmap Cloud credentials',
                        callback: callback()
                      })
                    }
                  } else {
                    let callback = () => {
                      window.open(chrome.runtime.getURL('pages/options.html#cmapCloudConfiguration'))
                    }
                    Alerts.infoAlert({
                      text: 'Please, provide us your Cmap Cloud login credentials in the configuration page of the Web extension.',
                      title: 'We need your Cmap Cloud credentials',
                      callback: callback()
                    })
                  }
                })
              })
              aElement.addEventListener('mouseenter', () => {
                aElement.style.fontWeight = 'bold'
              })
              aElement.addEventListener('mouseleave', () => {
                aElement.style.fontSize = '12px'
                aElement.style.lineHeight = '14px'
                aElement.id = 'conceptGoLabel'
                aElement.style.fontWeight = 'normal'
              })
              newListElement.appendChild(aElement)
              listElement.parentNode.parentNode.insertBefore(newListElement, listElement.parentNode.parentNode.firstChild)
            }
            // Options for the observer (which mutations to observe)
            const config = { attributes: true, childList: true, subtree: true }
            // Callback function to execute when mutations are observed
            const callback = (mutationList, observer) => {
              for (const mutation of mutationList) {
                if (mutation.type === 'childList') {
                  if (mutation.addedNodes) {
                    if (mutation.addedNodes.length > 0) {
                      // console.log('added nodes', mutation.addedNodes)
                      const node = mutation.addedNodes[0]
                      if (node.className && node.className === 'gwt-PopupPanel') {
                        console.log('OPEN')
                        // Check if the parent div contains a child div with class "gwt-Label" and inner text "Annotation"
                        const isAnnotationNote = node.outerHTML.includes('<div class="gwt-Label" style="position: absolute; left: 2px; top: 0px;">Annotation</div>')
                        const isContextMenu = node.outerHTML.includes('<td class="gwt-MenuItem" id="gwt-uid-3" role="menuitem" colspan="2">Annotate...</td>')
                        const isColors = node.outerHTML.includes('<button type="button" class="gwt-Button">No Fill</button>')
                        if (isAnnotationNote) {
                          console.log("OPEN ANNOTATION'.")
                          showFeedbackNoteFirstTime(node)
                        } else if (isContextMenu) {
                          const contextMenuFeedbackLabel = document.getElementById('gwt-uid-3')
                          contextMenuFeedbackLabel.innerText = 'Feedback...'
                        } else if (isColors) {
                          console.log('Color')
                          updateColors(node)
                        }
                        addToolTipToAnnotations(node)
                      } else if (node.innerText === 'Change Properties...') {
                        loadAnnotations()
                      } else if (node.innerText === 'New Cmap') {
                        const listElement = document.querySelector('li > a#create-url-res')
                        const conceptGoLabel = document.querySelector('li > a#conceptGoLabel')
                        if (listElement && !conceptGoLabel) {
                          const newListElement = document.createElement('li')
                          const aElement = document.createElement('a')
                          aElement.style.fontSize = '12px'
                          aElement.style.lineHeight = '14px'
                          aElement.style.color = '#4682b4'
                          aElement.id = 'conceptGoLabel'
                          aElement.innerText = 'New annotation-driven Cmap'
                          aElement.addEventListener('click', () => {
                            chrome.runtime.sendMessage({ scope: 'cmapCloud', cmd: 'getUserData' }, (response) => {
                              if (response.data) {
                                const data = response.data
                                if (data.userData.user && data.userData.password && data.userData.uid) {
                                  const cmapCloudClient = new CmapCloudClient(data.userData.user, data.userData.password, data.userData.uid)
                                  console.log('createTask')
                                  // createTask()
                                  createWindow(cmapCloudClient, data.userData)
                                } else {
                                  let callback = () => {
                                    window.open(chrome.runtime.getURL('pages/options.html#cmapCloudConfiguration'))
                                  }
                                  Alerts.infoAlert({
                                    text: 'Please, provide us your Cmap Cloud login credentials in the configuration page of the Web extension.',
                                    title: 'We need your Cmap Cloud credentials',
                                    callback: callback()
                                  })
                                }
                              } else {
                                let callback = () => {
                                  window.open(chrome.runtime.getURL('pages/options.html#cmapCloudConfiguration'))
                                }
                                Alerts.infoAlert({
                                  text: 'Please, provide us your Cmap Cloud login credentials in the configuration page of the Web extension.',
                                  title: 'We need your Cmap Cloud credentials',
                                  callback: callback()
                                })
                              }
                            })
                          })
                          aElement.addEventListener('mouseenter', () => {
                            aElement.style.fontWeight = 'bold'
                          })
                          aElement.addEventListener('mouseleave', () => {
                            aElement.style.fontSize = '12px'
                            aElement.style.lineHeight = '14px'
                            aElement.id = 'conceptGoLabel'
                            aElement.innerText = 'New annotation-driven Cmap'
                            aElement.style.fontWeight = 'normal'
                          })
                          newListElement.appendChild(aElement)
                          listElement.parentNode.parentNode.insertBefore(newListElement, listElement.parentNode.parentNode.firstChild)
                        }
                      } else if (node.className === 'res-meta-dialog ui-dialog-content ui-widget-content') {
                        node.style.height = '230px'
                        updateProperties(node)
                      }
                    }
                  } else {
                    console.log('removed node', mutation.removedNodes)
                  }
                } if (mutation.type === 'attributes' && mutation.attributeName === 'style' && !noteOpened) {
                  const targetNode = mutation.target
                  const newVisibilityValue = targetNode.getAttribute('style')
                  const noteLabel = targetNode.querySelectorAll('.gwt-Label')[0]
                  if ((targetNode.className === 'gwt-PopupPanel') && (newVisibilityValue.includes('visibility: visible;')) && (noteLabel && noteLabel.innerText === 'Feedback')) {
                    noteOpened = true
                    showFeedbackNote(targetNode)
                    changeNoteOpenedValue()
                  }
                }
              }
            }
            // Create an observer instance linked to the callback function
            const observer = new MutationObserver(callback)
            // Start observing the target node for configured mutations
            observer.observe(document.body, config)
          }
        })
      }
    })
    clearInterval(checkDOM)
  }, 1000)
}

const createTask = function (groupName, focusQuestion, dimensionString, userData, urlInput) {
  groupName = LanguageUtils.normalizeString(groupName)
  if (groupName.length > 25) {
    groupName = groupName.substring(0, 24)
  }
  window.cag.annotationServerManager.client.createNewGroup({ name: groupName, description: 'A group created using Concept&Go' + chrome.runtime.getManifest().name }, (err, newGroup) => {
    if (err) {
      window.alert('Unable to load swal. Please contact developer.')
    } else {
      if (_.isString(dimensionString)) {
        let urlList
        if (urlInput && _.isString(urlInput)) {
          urlList = urlInput.split(';').filter(Boolean)
          urlList.forEach(element => element.trim)
        }
        const dimensionsList = dimensionString.split(';')
        dimensionsList.forEach(element => element.trim)
        groupName = LanguageUtils.normalizeString(groupName)
        let tempCodebook
        if (urlList) {
          tempCodebook = Codebook.fromCXLFile(null, dimensionsList, groupName, focusQuestion, [], urlInput)
        } else {
          tempCodebook = Codebook.fromCXLFile(null, dimensionsList, groupName, focusQuestion, [], null)
        }
        Codebook.setAnnotationServer(newGroup.id, (annotationServer) => {
          tempCodebook.annotationServer = annotationServer
          const topicThemeObject = _.filter(tempCodebook.themes, (theme) => {
            return theme.topic === groupName || theme.name === groupName
          })
          topicThemeObject[0].isTopic = true
          const annotations = tempCodebook.toAnnotations()
          // Send create highlighter
          window.cag.annotationServerManager.client.createNewAnnotations(annotations, (err, codebookAnnotations) => {
            if (err) {
              Alerts.errorAlert({ text: 'Unable to create new group.' })
            } else {
              Codebook.fromAnnotations(codebookAnnotations, (err, codebook) => {
                if (err) {
                  Alerts.errorAlert({ text: 'Unable to create codebook.' })
                } else {
                  CXLExporter.createCmapFromCmapCloud(newGroup, codebook, groupName, userData)
                  const window = document.getElementById('windowDialog')
                  const background = document.getElementById('windowBackground')
                  window.remove()
                  background.remove()
                  Alerts.successAlert({ text: 'Annotation Group successfully created!' })
                }
              })
            }
          })
        })
      }
    }
  })
}

const createWindow = function (cmapCloudClient, userData) {
  const htmlString = '<div id="windowDialog" tabIndex="-1" role="dialog" style="position: absolute; height: auto; width: 450px; top: 225px; left: 332px; display: block;" aria-describedby="ui-id-36" aria-labelledby="ui-id-37"> ' +
    '<div id="windowHeader">' +
    '<span id="windowDialogTitle">Creating new annotation driven concept map</span> ' +
    '</div> ' +
    '<div id="windowMetadata" style="display: block; width: auto; min-height: 0px; max-height: none; height: 235px;">' +
    '<form>' +
    '<label htmlFor="rmeta_name" class="windowLabel">Cmap name</label><input placeholder="Provide Cmap name.." type="text" name="name" id="rmeta_name" class="windowInput">' +
    '<label class="windowLabel" htmlFor="rmeta_focus_question">Focus question</label><input placeholder="Provide focus question..." type="text" name="focus_question" id="rmeta_focus_question" class="windowInput">' +
    '<label class="windowLabel" htmlFor="rmeta_keywords">Categories separated by semicolons ;</label><input placeholder="Category1;Category2..." type="text" name="keywords" id="rmeta_keywords" class="windowInput">' +
    '<label class="windowLabel" htmlFor="rmeta_urls">URLs of your reading materials separated by semicolons ;</label><input placeholder="URL1;URL2..." type="text" name="urls" id="rmeta_urls" class="windowInput">' +
    '</form> </div> ' +
    '<div id="windowButtonPane"> ' +
    '<div id="windowButtonSet""> ' +
    '<span id="windowErrorMessage" style="margin-left: 10px;"></span>' +
    '<button class="windowButton" type="button" id="cancelBtn" role="button"><span class="windowButtonSpan">Cancel</span></button> ' +
    '<button class="windowButton" type="button" id="createMapBtn" role="button"><span class="windowButtonSpan">Create Cmap</span></button> ' +
    '</div></div></div>'
  const parser = new DOMParser()
  const html = parser.parseFromString(htmlString, 'text/html')
  let window = html.querySelector('div')
  document.body.appendChild(window)
  window = document.getElementById('windowDialog')
  window.style.zIndex = '5000'
  const backgroundHTMLDiv = document.createElement('div')
  backgroundHTMLDiv.id = 'windowBackground'
  backgroundHTMLDiv.style.zIndex = '4999'
  window.parentNode.insertBefore(backgroundHTMLDiv, window.nextSibling)
  const background = document.getElementById('windowBackground')
  // Define buttons
  const createMapBtn = document.getElementById('createMapBtn')
  createMapBtn.onclick = () => {
    const errorMessage = document.getElementById('windowErrorMessage')
    checkFormData(cmapCloudClient, (message) => {
      if (message === 'OK') {
        const nameInput = document.getElementById('rmeta_name')
        const focusQuestionInput = document.getElementById('rmeta_focus_question')
        const categoriesInput = document.getElementById('rmeta_keywords')
        const urlInput = document.getElementById('rmeta_urls')
        errorMessage.style.color = '#006400'
        errorMessage.textContent = 'Creating annotation group...'
        createTask(nameInput.value, focusQuestionInput.value, categoriesInput.value, userData, urlInput.value)
      } else {
        errorMessage.style.color = '#8B0000'
        errorMessage.textContent = message
      }
    })
  }
  const cancelBtn = document.getElementById('cancelBtn')
  cancelBtn.onclick = () => {
    console.log('cancelBtn')
    window.remove()
    background.remove()
  }
}

const getURLFromSelectedAnnotation = function (selectedAnnotation) {
  console.log(window.cag.annotations)
  const id = selectedAnnotation.slice(-22)
  console.log(id)
  let url
  if (window.cag.annotations.length > 0) {
    const annotation = window.cag.annotations.find((anno) => {
      return anno.id === id
    })
    url = annotation.target[0].source + '#' + Config.urlParamName + ':' + annotation.id
  }
  return url
}

const getTextFromSelectedAnnotation = function (selectedAnnotation) {
  let text
  console.log(window.cag.annotations)
  const id = selectedAnnotation.slice(-22)
  console.log(id)
  if (window.cag.annotations.length > 0) {
    const annotation = window.cag.annotations.find((anno) => {
      return anno.id === id
    })
    if (annotation && annotation.target[0] && annotation.target[0].selector) {
      const textQuote = annotation.target[0].selector.find((sel) => {
        return sel.type === 'TextQuoteSelector'
      })
      if (textQuote) {
        text = textQuote.exact
      }
    }
  }
  return text
}

const updateColors = function (node) {
  const divElements = node.querySelectorAll('div[tabindex="0"]>div>div')
  if (window.cag.codebook) {
    let dimensionColors = window.cag.codebook.dimensions.map(item => {
      const color = ColorUtils.turnForCmapCloud(item.color)
      return color.substring(0, color.length - 4)
    })
    dimensionColors = dimensionColors.filter(color => {
      return color !== '255,255,150'
    })
    console.log(dimensionColors)
    Array.from(divElements).forEach(div => {
      let background = div.style.backgroundColor
      background = background.replaceAll('rgb(', '').replaceAll(' ', '').replaceAll(')', '')
      if (!dimensionColors.includes(background) && background !== '237,244,246') {
        div.remove()
      }
      console.log(div.style.backgroundColor)
    })
  }
}

const addToolTipToAnnotations = function (node) {
  const annotations = node.children[0].children[0].children[0].children
  for (let i = 0; i < annotations.length; i++) {
    const id = annotations[i].innerText.slice(-22)
    console.log(id)
    if (window.cag.annotations.length > 0) {
      const annotation = window.cag.annotations.find((anno) => {
        return anno.id === id
      })
      const textQuote = annotation.target[0].selector.find((sel) => {
        return sel.type === 'TextQuoteSelector'
      })
      let text
      if (textQuote) {
        text = textQuote.exact
      }
      annotations[i].classList.add('tooltipCmap')
      const span = document.createElement('span')
      span.className = 'tooltiptextCmap'
      span.innerText = text
      annotations[i].appendChild(span)
    }
  }
}

const loadAnnotations = function () {
  console.log('YOU HAVE OPEN A MAP')
  const list = document.querySelectorAll('.cmap-tab.active')
  if (list.length > 0) {
    const groupId = getGroupId(list)
    window.cag.annotationServerManager.client.searchAnnotations({
      group: groupId,
      order: 'desc'
    }, (err, allAnnotations) => {
      if (err) {
        Alerts.errorAlert({
          title: 'Log in required',
          text: 'Annotations not found'
        })
      } else {
        const annotations = _.filter(allAnnotations, (annotation) => {
          return !annotation.motivation && annotation.motivation !== 'codebookDevelopment'
        })
        window.cag.annotations = annotations
        const codebookDevelopment = _.filter(allAnnotations, (annotation) => {
          return annotation.motivation && (annotation.motivation === 'codebookDevelopment' || annotation.motivation === 'defining')
        })
        window.cag.codebookAnnotations = codebookDevelopment
        Codebook.fromAnnotations(codebookDevelopment, (err, codebook) => {
          if (err) {
            Alerts.errorAlert({ text: 'Error parsing codebook. Error: ' + err.message })
          } else {
            console.log(codebook)
            window.cag.codebook = codebook
          }
        })
      }
    })
  }
}

const checkFormData = function (cmapCloudClient, callback) {
  getFolderNames(cmapCloudClient, (folderNames) => {
    let message = 'OK'
    const nameInput = document.getElementById('rmeta_name')
    const focusQuestionInput = document.getElementById('rmeta_focus_question')
    const categoriesInput = document.getElementById('rmeta_keywords')
    const urlsInput = document.getElementById('rmeta_urls')
    let urlList = []
    let dimensionsList = []
    try {
      dimensionsList = categoriesInput.value.split(';').filter(Boolean)
    } catch (e) {
      message = 'Error parsing categories'
    }
    try {
      urlList = urlsInput.value.split(';').filter(Boolean)
    } catch (e) {
      message = 'Error parsing urls'
    }
    if (folderNames && folderNames.includes(nameInput.value)) {
      message = 'Cmap name already exist'
    }
    if (nameInput.value.length < 5) {
      message = 'Provide a larger Cmap name'
    } else if (focusQuestionInput.value < 5) {
      message = 'Provide a larger focus question'
    } else if (!dimensionsList || dimensionsList.length < 1 || categoriesInput.value === '') {
      message = 'Provide categories'
    } else if (!urlList || urlList.length < 1 || urlsInput.value === '') {
      message = 'Provide URLs'
    } else if (urlList && urlList.length > 0) {
      urlList.forEach(url => {
        if (!isURL(url)) {
          message = 'A provided URL is incorrect'
        }
      })
    }
    callback(message)
  })
}

function isURL (string) {
  // Regular expression pattern to match a URL
  let urlPattern = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i
  // Test if the string matches the URL pattern
  return urlPattern.test(string)
}

const getFolderNames = function (cmapCloudClient, callback) {
  cmapCloudClient.getRootFolderInfor((data) => {
    const elements = data.getElementsByTagName('res-meta')
    if (elements.length > 0) {
      const folderElements = _.map(_.filter(elements, (element) => {
        if (element.attributes.format) {
          return element.attributes.format.nodeValue === 'x-nlk-project/x-binary'
        }
      }), (folderElement) => {
        return folderElement.attributes.title.nodeValue
      })
      callback(folderElements)
    } else {
      callback()
    }
  })
}

const getGroupId = function (list) {
  const name = list[0].querySelectorAll('.cmap-tab-label')
  let groupID = name[0].innerText.slice(-10).replace('(', '').replace(')', '')
  if (groupID.includes(')') || groupID.includes('(')) {
    let inputString = name[0].innerText
    // Use a regular expression to find the last occurrence of text within parentheses
    const regex = /\([^()]*\)(?!.*\([^()]*\))/
    inputString = inputString.replace(regex, '').trim()
    groupID = inputString.slice(-10).replace('(', '').replace(')', '')
    return groupID
  } else {
    return groupID
  }
}

const updateProperties = function (node) {
  console.log('window opened')
  node.style.height = '178.3px'
  const keywordLabel = node.querySelector('label[for="rmeta_keywords"]')
  if (keywordLabel) {
    keywordLabel.textContent = 'Categories (separate using semicolons(;))'
  }
  const languageLabel = node.querySelector('label[for="rmeta_language"]')
  if (languageLabel) {
    languageLabel.textContent = 'Reading materials (separate URLs using semicolons(;))'
  }
  /* const languageInput = node.querySelector('input[name="language"]')
  if (languageInput) {
    languageInput.style.visibility = 'hidden'
  } */
  const authorLabel = node.querySelector('label[for="rmeta_author"]')
  if (authorLabel) {
    authorLabel.style.visibility = 'hidden'
  }
  const authorInput = node.querySelector('input[name="author"]')
  if (authorInput) {
    authorInput.style.visibility = 'hidden'
  }
  const emailLabel = node.querySelector('label[for="rmeta_email"]')
  if (emailLabel) {
    emailLabel.style.visibility = 'hidden'
  }
  const emailInput = node.querySelector('input[name="email"]')
  if (emailInput) {
    emailInput.style.visibility = 'hidden'
  }
  const organizationLabel = node.querySelector('label[for="rmeta_organization"]')
  if (organizationLabel) {
    organizationLabel.style.visibility = 'hidden'
  }
  const organizationInput = node.querySelector('input[name="organization"]')
  if (organizationInput) {
    organizationInput.style.visibility = 'hidden'
  }
}

const showFeedbackNote = function (targetNode) {
  console.log('Visibility attribute changed to Feedback note')
  const textArea = targetNode.querySelector('textarea.gwt-TextArea')
  textArea.style.width = '206px'
  textArea.style.height = '83px'
  const firstInput = targetNode.querySelectorAll('input.gwt-TextBox')[0]
  firstInput.style.width = textArea.style.width
  // Change width
  const noteDiv = targetNode.querySelector('div[tabindex="0"]')
  noteDiv.style.height = '320px'
  noteDiv.style.width = '210px'
  const noteChildDiv = noteDiv.querySelector('div')
  noteChildDiv.style.overflow = 'visible'
  // change last img
  const lastImg = targetNode.querySelector('img.gwt-Image')
  lastImg.style.top = '290px'
  lastImg.style.left = '200px'
  lastImg.style.visibility = 'hidden'
  // change noteButton
  const noteButton = targetNode.querySelector('div.gwt-PushButton')
  noteButton.style.left = '192px'
  // restore selectElement
  const selectElement = noteDiv.querySelector('select.selectedNames')
  selectElement.style.position = 'absolute'
  selectElement.style.left = '2px'
  let position = firstInput.style.top.replace('px', '')
  position = parseInt(position) + 40
  selectElement.style.top = position.toString() + 'px'
  selectElement.style.width = textArea.style.width
  /// Restore second select
  const selectElementAnnotations = noteDiv.querySelector('select.selectedAnnotations')
  selectElementAnnotations.style.position = 'relative'
  selectElementAnnotations.style.left = '2px'
  let positionSelectElementConcepts = selectElement.style.top.replace('px', '')
  positionSelectElementConcepts = parseInt(positionSelectElementConcepts) + 30
  selectElementAnnotations.style.top = positionSelectElementConcepts.toString() + 'px'
  selectElementAnnotations.style.width = selectElement.style.width
  // Add button
  const addButton = noteDiv.querySelector('button.addButton')
  addButton.style.position = 'relative'
  addButton.style.left = '2px'
  addButton.style.top = selectElementAnnotations.style.top
  addButton.style.width = selectElementAnnotations.style.width
  // restore annotation Div
  const annotationDiv = targetNode.querySelector('div.annotationDiv')
  annotationDiv.style.position = 'relative'
  let positionAddButton = addButton.style.top.replace('px', '')
  positionAddButton = parseInt(positionAddButton) + 5
  annotationDiv.style.top = positionAddButton.toString() + 'px'
  annotationDiv.style.width = addButton.style.width
}

const showFeedbackNoteFirstTime = function (node) {
  const noteLabel = node.querySelectorAll('.gwt-Label')[0]
  noteLabel.innerText = 'Feedback'
  const noteButton = node.querySelector('div.gwt-PushButton')
  noteButton.addEventListener('click', function () {
    // This function will be executed when the div is clicked
    console.log('Close annotation')
  })
  const textArea = node.querySelector('textarea.gwt-TextArea')
  textArea.style.width = '206px'
  textArea.style.height = '83px'
  const selectedElements = []
  const firstInput = node.querySelectorAll('input.gwt-TextBox')[0]
  firstInput.style.width = textArea.style.width
  const secondInput = node.querySelectorAll('input.gwt-TextBox')[1]
  if (!secondInput.value.startsWith('id:')) {
    secondInput.value = 'id:'
  }
  // Format the date as a string
  if (!isValidDateFormat(firstInput.value)) {
    // Get the current date and time
    const currentDate = new Date()
    // Add an hour to the current date
    currentDate.setHours(currentDate.getHours())
    const formattedDate = currentDate.toLocaleString()
    firstInput.value = formattedDate
  }
  secondInput.style.visibility = 'hidden'
  // Change width
  const noteDiv = node.querySelector('div[tabindex="0"]')
  noteDiv.style.height = '310px'
  noteDiv.style.width = '210px'
  const noteChildDiv = noteDiv.querySelector('div')
  noteChildDiv.style.overflow = 'visible'
  // change last img
  const lastImg = node.querySelector('img.gwt-Image')
  lastImg.style.top = '290px'
  lastImg.style.visibility = 'hidden'
  const canvasText = document.querySelectorAll('[CanvasType="Text"]')
  canvasText.forEach(mapElement => {
    let buttonItem
    const isSelectedConcept = mapElement.parentElement.parentElement.previousElementSibling
    const isSelectedLinkingWord = mapElement.previousElementSibling
    if (isSelectedConcept.tagName === 'rect') {
      buttonItem = mapElement.parentElement.parentElement.querySelector('image[CanvasType=image]')
      selectedElements.push({ elem: mapElement, buttonItem: buttonItem })
    }
    if (isSelectedLinkingWord.tagName === 'rect' && isSelectedLinkingWord.stroke === '#9598ff') {
      buttonItem = mapElement.querySelector('image[CanvasType=image]')
      console.log(buttonItem)
      selectedElements.push({ elem: mapElement, buttonItem: buttonItem })
    }
  })
  const selectedElementsNames = selectedElements.map((element) => {
    let name = ''
    console.log(element.elem)
    const spans = Array.from(element.elem.children)
    spans.forEach((spanElement) => {
      if (spanElement.textContent === 't') {
        name += ' '
      } else {
        name += spanElement.textContent
      }
    })
    return name
  })
  console.log(selectedElementsNames)
  //
  // Create a select element
  const selectElement = document.createElement('select')
  selectElement.className = 'selectedNames gwt-TextBox'
  selectElement.style.position = 'absolute'
  selectElement.style.left = '2px'
  let position = firstInput.style.top.replace('px', '')
  position = parseInt(position) + 40
  selectElement.style.top = position.toString() + 'px'
  selectElement.style.width = firstInput.style.width
  selectedElementsNames.forEach(name => {
    const option1 = document.createElement('option')
    option1.value = name
    option1.text = name
    selectElement.appendChild(option1)
  })
  firstInput.parentNode.insertBefore(selectElement, firstInput.nextSibling)
  //
  /// Create second select
  const selectElementAnnotations = document.createElement('select')
  selectElementAnnotations.className = 'selectedAnnotations gwt-TextBox'
  selectElementAnnotations.style.position = 'relative'
  selectElementAnnotations.style.left = '2px'
  let positionSelectElementConcepts = selectElement.style.top.replace('px', '')
  positionSelectElementConcepts = parseInt(positionSelectElementConcepts) + 30
  selectElementAnnotations.style.top = positionSelectElementConcepts.toString() + 'px'
  selectElementAnnotations.style.width = selectElement.style.width
  const allAnnotations = _.uniq(Array.from(document.querySelectorAll('#cmaps-and-res-view img')).map((elem) => { return elem.getAttribute('alt') }))
  allAnnotations.forEach(elem => {
    const camelized = camelize(selectElement.value)
    if (elem.includes('---' && camelized)) {
      const optionAnnotation = document.createElement('option')
      const highlightedText = getTextFromSelectedAnnotation(elem)
      const url = getURLFromSelectedAnnotation(elem)
      const id = elem.slice(-22)
      optionAnnotation.value = elem
      optionAnnotation.text = 'TEXT: ' + highlightedText + ' --- FROM:' + url.slice(0, -22).replace('#cag:', '')
      // onchange selectElementAnnotations
      selectElementAnnotations.appendChild(optionAnnotation)
    }
  })
  selectElement.parentNode.insertBefore(selectElementAnnotations, selectElement.nextSibling)
  // Add button
  const addButton = document.createElement('button')
  addButton.className = 'addButton'
  addButton.innerText = 'Add annotation'
  addButton.style.position = 'relative'
  addButton.style.left = '2px'
  addButton.style.top = selectElementAnnotations.style.top
  addButton.style.width = selectElementAnnotations.style.width
  addButton.addEventListener('click', () => {
    const number = annotationDiv.children.length
    const newAnchor = document.createElement('a')
    const selectedAnnotation = selectElementAnnotations.value
    const annotationURL = getURLFromSelectedAnnotation(selectedAnnotation)
    const id = selectedAnnotation.slice(-22)
    secondInput.value = secondInput.value + id + ';'
    // Set the href attribute
    newAnchor.href = annotationURL
    // Set the inner text or content of the anchor
    newAnchor.textContent = 'anno' + number + '; '
    newAnchor.addEventListener('click', () => {
      window.open(annotationURL)
    })
    annotationDiv.appendChild(newAnchor)
  })
  selectElementAnnotations.parentNode.insertBefore(addButton, selectElementAnnotations.nextSibling)
  selectElement.addEventListener('change', () => {
    selectElementAnnotations.innerHTML = ''
    const allAnnotations = _.uniq(Array.from(document.querySelectorAll('#cmaps-and-res-view img')).map((elem) => { return elem.getAttribute('alt') }))
    allAnnotations.forEach(elem => {
      const camelized = camelize(selectElement.value)
      if (elem.includes('---' && camelized)) {
        if (elem.includes('->')) {
          if (elem.includes('->' + camelized + '->')) {
            const optionAnnotation = document.createElement('option')
            const highlightedText = getTextFromSelectedAnnotation(elem)
            const url = getURLFromSelectedAnnotation(elem)
            const id = elem.slice(-22)
            optionAnnotation.value = elem
            optionAnnotation.text = 'TEXT: ' + highlightedText + ' --- FROM:' + url.slice(0, -22).replace('#cag:', '')
            // onchange selectElementAnnotations
            selectElementAnnotations.appendChild(optionAnnotation)
          }
        } else {
          const optionAnnotation = document.createElement('option')
          const highlightedText = getTextFromSelectedAnnotation(elem)
          const url = getURLFromSelectedAnnotation(elem)
          const id = elem.slice(-22)
          optionAnnotation.value = elem
          optionAnnotation.text = 'TEXT: ' + highlightedText + ' --- FROM:' + url.slice(0, -22).replace('#cag:', '')
          // onchange selectElementAnnotations
          selectElementAnnotations.appendChild(optionAnnotation)
        }
      }
    })
  })
  const annotationDiv = document.createElement('div')
  annotationDiv.className = 'annotationDiv'
  annotationDiv.contentEditable = 'true'
  annotationDiv.style.left = '2px'
  annotationDiv.innerText = 'Annotations: '
  annotationDiv.style.position = 'relative'
  annotationDiv.style.top = addButton.style.top
  annotationDiv.style.width = addButton.style.width
  const savedIDs = secondInput.value.replace('id:', '')
  if (savedIDs !== '') {
    const annotationIDs = savedIDs.split(';').filter(Boolean)
    annotationIDs.forEach(id => {
      const number = annotationDiv.children.length
      const newAnchor = document.createElement('a')
      const annotationURL = getURLFromAnnotationID(id)
      // Set the href attribute
      newAnchor.href = annotationURL
      // Set the inner text or content of the anchor
      newAnchor.textContent = 'anno' + number + '; '
      newAnchor.addEventListener('click', () => {
        window.open(annotationURL)
      })
      annotationDiv.appendChild(newAnchor)
    })
  }
  addButton.parentNode.insertBefore(annotationDiv, addButton.nextSibling)
}

function isValidDateFormat (inputString) {
  const dateFormatRegex = /^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2}$/
  return dateFormatRegex.test(inputString)
}

function camelize (str) {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]+/g, '')
    .replace(/^[A-Z]/, firstChar => firstChar.toLowerCase())
}

function changeNoteOpenedValue () {
  setTimeout(() => {
    noteOpened = false // Change the variable value after 1 second
    console.log('Variable value changed to true after 1 second')
  }, 1000) // 1000 milliseconds (1 second)
}

const getURLFromAnnotationID = function (id) {
  let url
  if (window.cag.annotations.length > 0) {
    const annotation = window.cag.annotations.find((anno) => {
      return anno.id === id
    })
    url = annotation.target[0].source + '#' + Config.urlParamName + ':' + annotation.id
  }
  return url
}

window.onload = kudeatzaileakHasieratu
