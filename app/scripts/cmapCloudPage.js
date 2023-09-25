import HypothesisClientManager from './annotationServer/hypothesis/HypothesisClientManager'
import _ from 'lodash'
import LanguageUtils from './utils/LanguageUtils'
import Alerts from './utils/Alerts'

const getURLFromSelectedAnnotation = function (selectedAnnotation) {
  return selectedAnnotation
}
const kudeatzaileakHasieratu = function () {
  const checkDOM = setInterval(function () {
    window.cag = {}
    window.cag.annotations = []
    window.cag.annotationServerManager = new HypothesisClientManager()
    window.cag.annotationServerManager.init((err) => {
      if (err) {
        window.open(chrome.extension.getURL('pages/options.html#cmapCloudConfiguration'))
      } else {
        window.cag.annotationServerManager.isLoggedIn((err, result) => {
          if (err || !result) {
            if (LanguageUtils.isInstanceOf(window.cag.annotationServerManager, HypothesisClientManager)) {
              window.open(chrome.extension.getURL('pages/options.html#cmapCloudConfiguration'))
            }
          } else {
            // Options for the observer (which mutations to observe)
            const config = { attributes: false, childList: true, subtree: true }
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
                        const hasChildDiv = node.outerHTML.includes('<div class="gwt-Label" style="position: absolute; left: 2px; top: 0px;">Annotation</div>')
                        if (hasChildDiv) {
                          console.log("OPEN ANNOTATION'.")
                          const noteLabel = node.querySelectorAll('.gwt-Label')[0]
                          noteLabel.innerText = 'Feedback'
                          const noteButton = node.querySelector('div.gwt-PushButton')
                          noteButton.addEventListener('click', function () {
                            // This function will be executed when the div is clicked
                            console.log('clooose: ' + noteLabel)
                          })
                          const noteTextArea = node.querySelector('textarea.gwt-TextArea')
                          noteTextArea.value = 'Comment'
                          const selectedElements = []
                          const firstInput = node.querySelectorAll('input.gwt-TextBox')[0]
                          const secondInput = node.querySelectorAll('input.gwt-TextBox')[1]
                          // Get the current date and time
                          const currentDate = new Date()
                          // Add an hour to the current date
                          currentDate.setHours(currentDate.getHours() + 1)
                          // Format the date as a string
                          const formattedDate = currentDate.toLocaleString()
                          firstInput.value = formattedDate
                          secondInput.remove()
                          // Change width
                          const noteDiv = node.querySelector('div[tabindex="0"]')
                          noteDiv.style.height = '300px'
                          noteDiv.style.width = '210px'
                          const noteChildDiv = noteDiv.querySelector('div')
                          noteChildDiv.style.overflow = 'visible'
                          // change last img
                          const lastImg = node.querySelector('img.gwt-Image')
                          lastImg.style.top = '290px'
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
                          selectElement.style.width = '196px'
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
                          selectElementAnnotations.style.width = '196px'
                          const allAnnotations = _.uniq(Array.from(document.querySelectorAll('#cmaps-and-res-view img')).map((elem) => { return elem.getAttribute('alt') }))
                          allAnnotations.forEach(elem => {
                            const camelized = camelize(selectElement.value)
                            if (elem.includes('---' && camelized)) {
                              const optionAnnotation = document.createElement('option')
                              optionAnnotation.value = elem
                              optionAnnotation.text = elem
                              selectElementAnnotations.appendChild(optionAnnotation)
                            }
                          })
                          selectElement.parentNode.insertBefore(selectElementAnnotations, selectElement.nextSibling)

                          selectElement.addEventListener('change', () => {
                            selectElementAnnotations.innerHTML = ''
                            const selectedValue = selectElement.value
                            const allAnnotations = _.uniq(Array.from(document.querySelectorAll('#cmaps-and-res-view img')).map((elem) => { return elem.getAttribute('alt') }))
                            allAnnotations.forEach(elem => {
                              const camelized = camelize(selectedValue)
                              if (elem.includes('---' && camelized)) {
                                const optionAnnotation = document.createElement('option')
                                optionAnnotation.value = elem
                                optionAnnotation.text = elem
                                selectElementAnnotations.appendChild(optionAnnotation)
                              }
                            })
                          })

                          const annotationDiv = document.createElement('div')
                          annotationDiv.contentEditable = 'true'
                          annotationDiv.innerText = 'Annotations: '
                          annotationDiv.style.position = 'relative'
                          let positionSelectElementAnnotations = selectElementAnnotations.style.top.replace('px', '')
                          positionSelectElementAnnotations = parseInt(positionSelectElementAnnotations) + 5
                          annotationDiv.style.top = positionSelectElementAnnotations.toString() + 'px'
                          annotationDiv.style.width = '196px'
                          selectElementAnnotations.parentNode.insertBefore(annotationDiv, selectElementAnnotations.nextSibling)
                          // onchange selectElementAnnotations
                          selectElementAnnotations.addEventListener('change', () => {
                            const number = annotationDiv.children.length
                            const newAnchor = document.createElement('a')
                            const selectedAnnotation = selectElementAnnotations.value
                            const annotationURL = getURLFromSelectedAnnotation(selectedAnnotation)
                            // Set the href attribute
                            newAnchor.href = annotationURL
                            // Set the inner text or content of the anchor
                            newAnchor.textContent = 'anno' + number + '; '
                            annotationDiv.appendChild(newAnchor)
                          })
                        } else {
                          console.log("The parent div does not have a child div with class 'gwt-Label' and inner text 'Annotation'.")
                        }
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
                      } else if (node.innerText === 'Change Properties...') {
                        console.log('YOU HAVE OPEN A MAP')
                        const list = document.querySelectorAll('.cmap-tab.active')
                        if (list.length > 0) {
                          const name = list[0].querySelectorAll('.cmap-tab-label')
                          const groupID = name[0].innerText.slice(-10).replace('(', '').replace(')', '')
                          window.cag.annotationServerManager.client.searchAnnotations({
                            group: groupID,
                            order: 'desc'
                          }, (err, annotations) => {
                            if (err) {
                              Alerts.errorAlert({
                                title: 'Log in required',
                                text: 'Annotations not found'
                              })
                            } else {
                              annotations = _.filter(annotations, (annotation) => {
                                return !annotation.motivation && annotation.motivation !== 'codebookDevelopment'
                              })
                              window.cag.annotations = annotations
                            }
                          })
                        }
                      }
                    }
                  } else {
                    console.log('removed node', mutation.removedNodes)
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

function camelize (str) {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]+/g, '')
    .replace(/^[A-Z]/, firstChar => firstChar.toLowerCase())
}

window.onload = kudeatzaileakHasieratu
