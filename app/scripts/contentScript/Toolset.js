import axios from 'axios'
import _ from 'lodash'
import Alerts from '../utils/Alerts'
// import PreviousVersionAnnotationImporter from '../importExport/PreviousVersionAnnotationImporter'
import { CXLExporter } from '../importExport/cmap/CXLExporter'
import CXLImporter from '../importExport/cmap/CXLImporter'
import $ from 'jquery'
import MergeFromCmapCloud from '../importExport/cmap/cmapCloud/MergeFromCmapCloud'

class Toolset {
  constructor () {
    this.page = chrome.extension.getURL('pages/sidebar/toolset.html')
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
      this.toolsetHeader.querySelector('#appNameBadge').href = chrome.extension.getURL('/pages/options.html')
      // Import CXL
      const cxlArchiveFileImageUrl = chrome.extension.getURL('/images/cxl.png')
      this.cxlArchiveFileImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.cxlArchiveFileImage.src = cxlArchiveFileImageUrl
      this.cxlArchiveFileImage.id = 'cxlArchiveFileButton'
      this.cxlArchiveFileImage.title = 'Export resources to an archive file on the local file system'
      this.toolsetBody.appendChild(this.cxlArchiveFileImage)
      // CmapCloud Home
      this.CXLArchiveFileButtonHandler()
      const cxlCloudHomeImageUrl = chrome.extension.getURL('/images/cmapCloudHome.png')
      this.cxlCloudHomeImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.cxlCloudHomeImage.src = cxlCloudHomeImageUrl
      this.cxlCloudHomeImage.id = 'cxlCloudHomeButton'
      this.cxlCloudHomeImage.title = 'Open CmapCloud folder' // TODO i18n
      this.toolsetBody.appendChild(this.cxlCloudHomeImage)
      // Add menu when clicking on the button
      this.cxlCloudHomeImage.addEventListener('click', () => {
        this.CXLCloudHomeButtonHandler()
      })
      /* Export to CmapCloud
      const cxlCloudImageUrl = chrome.extension.getURL('/images/cmapCloud.png')
      this.cxlCloudImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.cxlCloudImage.src = cxlCloudImageUrl
      this.cxlCloudImage.id = 'cxlCloudButton'
      this.cxlCloudImage.title = 'Export map to CmapCloud' // TODO i18n
      this.cxlCloudImage.style.position = 'relative'
      this.cxlCloudImage.style.top = '-4px'
      this.toolsetBody.appendChild(this.cxlCloudImage)
      // Add menu when clicking on the button
      this.CXLCloudButtonHandler() */
      // Export to CmapCloud Pull
      const cxlCloudPushImageUrl = chrome.extension.getURL('/images/cmapCloudPull.png')
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
      const cxlCloudPullImageUrl = chrome.extension.getURL('/images/cmapCloudPush.png')
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
      /* const seroImageUrl = chrome.extension.getURL('/images/sero.png')
      this.seroImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.seroImage.src = seroImageUrl
      this.seroImage.id = 'seroButton'
      this.seroImage.title = 'Work with Sero' // TODO i18n
      this.toolsetBody.appendChild(this.seroImage)
      // Add menu when clicking on the button
      this.seroButtonHandler()
      const importPreviousVersionImageUrl = chrome.extension.getURL('/images/importExport.png')
      this.importPreviousVersionImage = $(toolsetButtonTemplate.content.firstElementChild).clone().get(0)
      this.importPreviousVersionImage.src = importPreviousVersionImageUrl
      this.importPreviousVersionImage.id = 'importPreviousVersion'
      this.importPreviousVersionImage.title = 'Import previous version' // TODO i18n
      this.toolsetBody.appendChild(this.importPreviousVersionImage)
      this.importPreviousVersionImage.addEventListener('click', () => {
        let annotatedResources = window.abwa.annotationManagement.annotationReader.allGroupAnnotations.map(annotation => annotation.target[0].source.url)
        annotatedResources = _.uniq(annotatedResources).filter(anno => anno !== undefined)
        if (annotatedResources) {
          PreviousVersionAnnotationImporter.importPreviousVersionAnnotations()
        } else {
          Alerts.infoAlert({ text: 'You have not annotated documents.', title: 'Problem' })
        }
      }) */
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
        let data = response.data
        if (data.userData.user && data.userData.password && data.userData.uid) {
          window.open('https://cmapcloud.ihmc.us/cmaps/myCmaps.html')
        }
      } else {
        let callback = () => {
          window.open(chrome.extension.getURL('pages/options.html#cmapCloudConfiguration'))
        }
        Alerts.infoAlert({ text: 'Please, provide us your Cmap Cloud login credentials in the configuration page of the Web extension.', title: 'We need your Cmap Cloud credentials', callback: callback() })
      }
    })
  }

  CXLArchiveFileButtonHandler () {
    // Create context menu for import export
    $.contextMenu({
      selector: '#cxlArchiveFileButton',
      trigger: 'left',
      build: () => {
        // Create items for context menu
        let items = {}
        items.import = { name: 'Import CXL' }
        // items.exportWithToolURL = { name: 'Export CXL with ' + 'Concept&Go' + ' URLs' }
        // items.exportWithHypothesisURL = { name: 'Export CXL with Hypothes.is URLs' }
        return {
          callback: (key, opt) => {
            if (key === 'import') {
              CXLImporter.importCXLfile()
            }
            /* if (key === 'exportWithHypothesisURL') {
              CXLExporter.exportCXLFile('archiveFile', 'hypothesis')
            }
            if (key === 'exportWithToolURL') {
              CXLExporter.exportCXLFile('archiveFile', 'tool')
            } */
          },
          items: items
        }
      }
    })
  }

  /* CXLCloudButtonHandler () {
    // Create context menu for import export
    $.contextMenu({
      selector: '#cxlCloudButton',
      trigger: 'left',
      build: () => {
        // Create items for context menu
        let items = {}
        items.merge = { name: 'Merge from CmapCloud' }
        items.export = { name: 'Export CXL to CmapCloud' }
        // items.exportWithHypothesisURL = { name: 'Export CXL with Hypothes.is URLs' }
        return {
          callback: (key, opt) => {
            chrome.runtime.sendMessage({ scope: 'cmapCloud', cmd: 'getUserData' }, (response) => {
              if (response.data) {
                const data = response.data
                if (data.userData.user && data.userData.password && data.userData.uid) {
                  const mappingAnnotation = window.abwa.annotationManagement.annotationReader.mappingAnnotation
                  if (key === 'export') {
                    if (mappingAnnotation) {
                      CXLExporter.exportCXLFile('cmapCloud', data.userData, mappingAnnotation)
                    } else {
                      CXLExporter.exportCXLFile('cmapCloud', data.userData, mappingAnnotation)
                    }
                  } else if (key === 'merge') {
                    // AnnotationImporter.importReviewAnnotations()
                    if (mappingAnnotation) {
                      MergeFromCmapCloud.mergeFromCmapCloud(data.userData, mappingAnnotation)
                    }
                  }
                } else {
                  let callback = () => {
                    window.open(chrome.extension.getURL('pages/options.html#cmapCloudConfiguration'))
                  }
                  Alerts.infoAlert({
                    text: 'Please, provide us your Cmap Cloud login credentials in the configuration page of the Web extension.',
                    title: 'We need your Cmap Cloud credentials',
                    callback: callback()
                  })
                }
              }
            })
          },
          items: items
        }
      }
    })
  } */

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
            let callback = () => {
              window.open(chrome.extension.getURL('pages/options.html#cmapCloudConfiguration'))
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
              let callback = () => {
                window.open(chrome.extension.getURL('pages/options.html#cmapCloudConfiguration'))
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

  /* seroButtonHandler () {
    // Create context menu for import export
    $.contextMenu({
      selector: '#seroButton',
      trigger: 'left',
      build: () => {
        // Create items for context menu
        const items = {}
        items.importFromSero = { name: 'Import from Sero' }
        items.exportToSero = { name: 'Export to Sero' }
        return {
          callback: (key, opt) => {
            if (key === 'importFromSero') {
              Alerts.simpleSuccessAlert({ text: 'This feature is work in progress' })
            }
            if (key === 'exportToSero') {
              Alerts.simpleSuccessAlert({ text: 'This feature is work in progress' })
            }
          },
          items: items
        }
      }
    })
  } */
}

export default Toolset
