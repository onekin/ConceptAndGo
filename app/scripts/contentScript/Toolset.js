import axios from 'axios'
import _ from 'lodash'
import Alerts from '../utils/Alerts'
import { CXLExporter } from '../importExport/cmap/CXLExporter'
import $ from 'jquery'
import MergeFromCmapCloud from '../importExport/cmap/cmapCloud/MergeFromCmapCloud'

class Toolset {
  constructor () {
    this.page = chrome.runtime.getURL('pages/sidebar/toolset.html')
  }

  init (callback) {
    console.debug('Initializing toolset')
    axios.get(this.page).then((response) => {
      // Get sidebar container
      this.sidebarContainer = document.querySelector('#abwaSidebarContainer')
      // Insert toolset container
      const groupSelectorContainer = this.sidebarContainer.querySelector('#groupSelectorContainer')
      groupSelectorContainer.insertAdjacentHTML('beforebegin', response.data)
      this.toolsetContainer = this.sidebarContainer.querySelector('#toolset')
      this.toolsetHeader = this.toolsetContainer.querySelector('#toolsetHeader')
      this.toolsetBody = this.sidebarContainer.querySelector('#toolsetBody')
      const toolsetButtonTemplate = this.sidebarContainer.querySelector('#toolsetButtonTemplate')
      // Add link to configuration page of the tool
      this.toolsetHeader.querySelector('#appNameBadge').href = chrome.runtime.getURL('/pages/options.html')
      const cxlCloudHomeImageUrl = chrome.runtime.getURL('/images/cmapCloudHome.png')
      this.cxlCloudHomeImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.cxlCloudHomeImage.src = cxlCloudHomeImageUrl
      this.cxlCloudHomeImage.id = 'cxlCloudHomeButton'
      this.cxlCloudHomeImage.title = 'Open CmapCloud folder' // TODO i18n
      this.toolsetBody.appendChild(this.cxlCloudHomeImage)
      // Add menu when clicking on the button
      this.cxlCloudHomeImage.addEventListener('click', () => {
        this.CXLCloudHomeButtonHandler()
      })
      // Export to CmapCloud Pull
      const cxlCloudPushImageUrl = chrome.runtime.getURL('/images/cmapCloudPull.png')
      this.cxlCloudImagePull = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.cxlCloudImagePull.src = cxlCloudPushImageUrl
      this.cxlCloudImagePull.id = 'cxlCloudButtonPull'
      this.cxlCloudImagePull.title = 'Pull Cmap from CmapCloud' // TODO i18n
      this.cxlCloudImagePull.style.position = 'relative'
      this.cxlCloudImagePull.style.bottom = '-4px'
      this.cxlCloudImagePull.style.width = '43px'
      this.toolsetBody.appendChild(this.cxlCloudImagePull)
      // Add menu when clicking on the button
      this.cxlCloudImagePull.addEventListener('click', () => {
        this.CXLCloudPullButtonHandler()
      })
      // Export to CmapCloud Push
      const cxlCloudPullImageUrl = chrome.runtime.getURL('/images/cmapCloudPush.png')
      this.cxlCloudImagePush = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.cxlCloudImagePush.src = cxlCloudPullImageUrl
      this.cxlCloudImagePush.id = 'cxlCloudButtonPush'
      this.cxlCloudImagePush.title = 'Push Cmap to CmapCloud' // TODO i18n
      this.cxlCloudImagePush.style.position = 'relative'
      this.cxlCloudImagePush.style.bottom = '-4px'
      this.cxlCloudImagePush.style.width = '43px'
      this.toolsetBody.appendChild(this.cxlCloudImagePush)
      // Add menu when clicking on the button
      this.cxlCloudImagePush.addEventListener('click', () => {
        this.CXLCloudPushButtonHandler()
      })
      // Check if exist any element in the tools and show it
      if (!_.isEmpty(this.toolsetBody.innerHTML)) {
        this.show()
      }
      console.debug('Initialized toolset')
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  /**
   * Show toolset in sidebar
   */
  show () {
    // Toolset aria-hidden is false
    this.toolsetContainer.setAttribute('aria-hidden', 'false')
  }

  /**
   * Hide toolset in sidebar
   */
  hide () {
    // Toolset aria-hidden is true
    this.toolsetContainer.setAttribute('aria-hidden', 'true')
  }

  destroy () {
    if (_.isElement(this.toolsetContainer)) {
      this.toolsetContainer.remove()
    }
  }

  CXLCloudHomeButtonHandler () {
    chrome.runtime.sendMessage({ scope: 'cmapCloud', cmd: 'getUserData' }, (response) => {
      if (response.data) {
        const data = response.data
        if (data.userData.user && data.userData.password && data.userData.uid) {
          window.open('https://cmapcloud.ihmc.us/cmaps/myCmaps.html')
        }
      } else {
        const callback = () => {
          window.open(chrome.runtime.getURL('pages/options.html#cmapCloudConfiguration'))
        }
        Alerts.infoAlert({ text: 'Please, provide us your Cmap Cloud login credentials in the configuration page of the Web extension.', title: 'We need your Cmap Cloud credentials', callback: callback() })
      }
    })
  }

  CXLCloudPullButtonHandler () {
    Alerts.confirmAlert({
      text: "You are going to merge the content of CmapCloud's map into current highlighter. Are you sure?",
      title: 'Merging from Cmap Cloud',
      callback: () => {
        chrome.runtime.sendMessage({ scope: 'cmapCloud', cmd: 'getUserData' }, (response) => {
          if (response.data) {
            const data = response.data
            if (data.userData.user && data.userData.password && data.userData.uid) {
              const mappingAnnotation = window.abwa.annotationManagement.annotationReader.mappingAnnotation
              // AnnotationImporter.importReviewAnnotations()
              if (mappingAnnotation) {
                MergeFromCmapCloud.mergeFromCmapCloud(data.userData, mappingAnnotation)
              }
            }
          } else {
            const callback = () => {
              window.open(chrome.runtime.getURL('pages/options.html#cmapCloudConfiguration'))
            }
            Alerts.infoAlert({
              text: 'Please, provide us your Cmap Cloud login credentials in the configuration page of the Web extension.',
              title: 'We need your Cmap Cloud credentials',
              callback: callback()
            })
          }
        })
      }
    })
  }

  CXLCloudPushButtonHandler () {
    Alerts.confirmAlert({
      text: 'You are going to export all the contents to CmapCloud. Are you sure?',
      title: 'Exporting to Cmap Cloud',
      callback: () => {
        chrome.runtime.sendMessage({ scope: 'cmapCloud', cmd: 'getUserData' }, (response) => {
          if (response.data) {
            const data = response.data
            if (data.userData.user && data.userData.password && data.userData.uid) {
              const mappingAnnotation = window.abwa.annotationManagement.annotationReader.mappingAnnotation
              if (mappingAnnotation) {
                CXLExporter.exportCXLFile('cmapCloud', data.userData, mappingAnnotation)
              } else {
                CXLExporter.exportCXLFile('cmapCloud', data.userData, mappingAnnotation)
              }
            } else {
              const callback = () => {
                window.open(chrome.runtime.getURL('pages/options.html#cmapCloudConfiguration'))
              }
              Alerts.infoAlert({
                text: 'Please, provide us your Cmap Cloud login credentials in the configuration page of the Web extension.',
                title: 'We need your Cmap Cloud credentials',
                callback: callback()
              })
            }
          }
        })
      }
    })
  }
}

export default Toolset
