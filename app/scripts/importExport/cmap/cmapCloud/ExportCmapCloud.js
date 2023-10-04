import CmapCloudClient from './CmapCloudClient'
import _ from 'lodash'
import Alerts from '../../../utils/Alerts'
import AnnotationUtils from '../../../utils/AnnotationUtils'
import LanguageUtils from '../../../utils/LanguageUtils'
import FileSaver from 'file-saver'
import Config from '../../../Config'
import jsYaml from 'js-yaml'

class ExportCmapCloud {
  static export (xmlDoc, urlFiles, userData, mappingAnnotation) {
    const user = userData.user
    const pass = userData.password
    const uid = userData.uid
    const cmapCloudClient = new CmapCloudClient(user, pass, uid)
    if (mappingAnnotation) {
      this.exportToExistingFolder(cmapCloudClient, xmlDoc, urlFiles, userData, mappingAnnotation)
    } else {
      this.exportWithVersions(cmapCloudClient, xmlDoc, urlFiles, userData)
    }
  }

  static getFolderName (data) {
    let folderName
    const elements = data.getElementsByTagName('res-meta')
    if (elements.length > 0) {
      const folderElements = _.map(_.filter(elements, (element) => {
        if (element.attributes.format) {
          return element.attributes.format.nodeValue === 'x-nlk-project/x-binary'
        }
      }), (folderElement) => {
        return folderElement.attributes.title.nodeValue
      })
      let candidateName
      let foundFolder
      let i = 1
      while (true) {
        candidateName = window.abwa.groupSelector.currentGroup.name + '_v.' + i
        foundFolder = _.filter(folderElements, (folderName) => {
          return folderName === candidateName
        })
        if (foundFolder.length === 0) {
          return candidateName
        } else {
          i++
        }
      }
    } else {
      folderName = window.abwa.groupSelector.currentGroup.name + '_v.1'
      return folderName
    }
  }

  static getFolderID (data) {
    const identifier = data.getElementsByTagName('dc:identifier')[0].innerHTML.match(/id=(\w+)-(\w+)-(\w+)/)[0]
    const folderID = identifier.toString().replace('id=', '')
    return folderID
  }

  static referenceURLIntoMap (xmlDoc, urlFiles, folderID) {
    const resourceGroupListElement = xmlDoc.getElementsByTagName('resource-group-list')[0]
    const resourcesMap = _.chain(urlFiles)
      .groupBy('parentId')
      .toPairs()
      .map(pair => _.zipObject(['parentId', 'urls'], pair))
      .value()
    for (let i = 0; i < resourcesMap.length; i++) {
      const resource = resourcesMap[i]
      const resourceGroupElement = xmlDoc.createElement('resource-group')
      const resourceGroupIdAttribute = document.createAttribute('parent-id')
      resourceGroupIdAttribute.value = resource.parentId
      resourceGroupElement.setAttributeNode(resourceGroupIdAttribute)
      const groupTypeIdAttribute = document.createAttribute('group-type')
      groupTypeIdAttribute.value = 'text-and-image'
      resourceGroupElement.setAttributeNode(groupTypeIdAttribute)
      for (let j = 0; j < resource.urls.length; j++) {
        const url = resource.urls[j]
        const resourceElement = xmlDoc.createElement('resource')
        const resourceElementLabelAttribute = document.createAttribute('label')
        resourceElementLabelAttribute.value = url.name
        resourceElement.setAttributeNode(resourceElementLabelAttribute)
        const resourceElementNameAttribute = document.createAttribute('resource-name')
        resourceElementNameAttribute.value = url.name
        resourceElement.setAttributeNode(resourceElementNameAttribute)
        const resourceElementURLAttribute = document.createAttribute('resource-url')
        resourceElementURLAttribute.value = 'https://cmapscloud.ihmc.us:443/id=' + url.id + '/' + url.name + '.url?redirect'
        resourceElement.setAttributeNode(resourceElementURLAttribute)
        const resourceElementIdAttribute = document.createAttribute('resource-id')
        resourceElementIdAttribute.value = url.id
        resourceElement.setAttributeNode(resourceElementIdAttribute)
        const resourceFolderIdAttribute = document.createAttribute('resource-folder-id')
        resourceFolderIdAttribute.value = folderID
        resourceElement.setAttributeNode(resourceFolderIdAttribute)
        const resourceServerIdAttribute = document.createAttribute('resource-server-id')
        resourceServerIdAttribute.value = '1MHZH5RK6-2C8DRLF-1'
        resourceElement.setAttributeNode(resourceServerIdAttribute)
        const resourceElementMimetypeAttribute = document.createAttribute('resource-mimetype')
        resourceElementMimetypeAttribute.value = 'text/x-url'
        resourceElement.setAttributeNode(resourceElementMimetypeAttribute)
        resourceGroupElement.appendChild(resourceElement)
      }
      resourceGroupListElement.appendChild(resourceGroupElement)
    }
    const mapString = new XMLSerializer().serializeToString(xmlDoc)
    return mapString
  }

  static exportFirstMap (name, xmlDoc, userData, group, dimensionsString) {
    const user = userData.user
    const pass = userData.password
    const uid = userData.uid
    const cmapCloudClient = new CmapCloudClient(user, pass, uid)
    cmapCloudClient.getRootFolderInfor((data) => {
      cmapCloudClient.createFolder(name, (newFolderData) => {
        const folderID = this.getFolderID(newFolderData)
        // Add resource-group-list
        const mapString = new XMLSerializer().serializeToString(xmlDoc)
        cmapCloudClient.uploadMap(folderID, mapString, (data) => {
          console.log(data)
          const urlWithIdentifier = data.childNodes[0].childNodes[5].innerHTML
          const pattern = /id=([\w-]+)/
          const match = urlWithIdentifier.match(pattern)
          // Check if a match was found and extract the desired string
          if (match) {
            const mapId = match[1]
            console.log(mapId)
            let annotationServer
            if (window.cag) {
              annotationServer = window.cag.annotationServerManager
            } else {
              annotationServer = window.abwa.annotationServerManager
            }
            const annotation = this.createAnnotation(folderID, mapId, group)
            annotationServer.client.createNewAnnotation(annotation, (err, newAnnotation) => {
              if (err) {
                Alerts.errorAlert({ text: 'Unexpected error, unable to create annotation' })
              } else {
                window.location.reload()
                Alerts.infoAlert({ text: 'You have available your resource in CmapCloud in ' + name + ' folder.\n Please move to the corresponding CmapCloud folder.', title: 'Completed' })
              }
            })
          } else {
            console.log('No match found')
          }
        }, group, dimensionsString)
        // FileSaver.saveAs(blob, LanguageUtils.camelize(folderName) + '(' + window.abwa.groupSelector.currentGroup.id + ')' + '.cxl')
        // })
      }, reason => {
      })
    })
  }

  static createAnnotation (folderId, mapId, group) {
    const motivationTag = 'motivation:mapping'
    const folderTag = Config.namespace + ':folder:' + folderId
    const mapTag = Config.namespace + ':map:' + mapId

    const tags = [motivationTag, folderTag, mapTag]
    // Construct text attribute of the annotation
    let textObject
    // Return the constructed annotation
    return {
      name: 'mappingAnnotation',
      group: group.id,
      permissions: {
        read: ['group:' + group.id]
      },
      references: [],
      motivation: 'mapping',
      tags: tags,
      target: [],
      text: jsYaml.dump(textObject),
      uri: 'https://hypothes.is/groups/' + group.id
    }
  }

  static exportWithVersions (cmapCloudClient, xmlDoc, urlFiles) {
    cmapCloudClient.getRootFolderInfor((data) => {
      const folderName = this.getFolderName(data)
      cmapCloudClient.createFolder(folderName, (newFolderData) => {
        const folderId = this.getFolderID(newFolderData)
        this.uploadAll(cmapCloudClient, xmlDoc, urlFiles, folderId, folderName)
      })
    })
  }

  static exportToExistingFolder (cmapCloudClient, xmlDoc, urlFiles, userData, mappingAnnotation) {
    const folderId = AnnotationUtils.getFolderIDFromAnnotation(mappingAnnotation)
    console.log(folderId)
    this.removeFolderResources(cmapCloudClient, folderId, () => {
      chrome.runtime.sendMessage({ scope: 'cmapCloud', cmd: 'getFolderList', data: folderId }, (response) => {
        if (response.info) {
          const parser = new DOMParser()
          const answer = parser.parseFromString(response.info, 'text/xml')
          console.log(answer)
          const list = answer.querySelector('res-meta-list')
          let identifiers = []
          Array.from(list.children).forEach(item => {
            Array.from(item.children).forEach(tag => {
              if (tag.nodeName === 'dc:identifier') {
                identifiers.push(tag)
              }
            })
          })
          const pattern = /id=([\w-]+)/
          identifiers = identifiers.map(identifier => {
            const match = identifier.innerHTML.match(pattern)
            // Check if a match was found and extract the desired string
            if (match) {
              return match[1]
            } else {
              return null
            }
          })
          console.log(identifiers)
          if (identifiers.length > 0) {
            Alerts.infoAlert({ text: 'Folder is not empty', title: 'Error' })
          } else {
            this.uploadAll(cmapCloudClient, xmlDoc, urlFiles, folderId)
          }
        }
      })
    })
  }

  static uploadAll (cmapCloudClient, xmlDoc, urlFiles, folderId, folderName) {
    const beginPromises = []
    for (let i = 0; i < urlFiles.length; i++) {
      const urlFile = urlFiles[i]
      const beginPromise = new Promise((resolve, reject) => {
        cmapCloudClient.uploadWebResource(folderId, urlFile, (data) => {
          resolve(data)
        })
      })
      beginPromises.push(beginPromise)
    }
    Promise.all(beginPromises).then(createdResources => {
      // Results
      const createdResourcesID = _.map(createdResources, (res) => {
        const retrieve = res.all[3].innerHTML.match(/id=[\s\S]*.url/)[0]
        const resourceIDName = retrieve.replace('.url', '').replace('id=', '')
        return resourceIDName
      })
      for (let j = 0; j < createdResourcesID.length; j++) {
        const id = createdResourcesID[j].split('/')[0]
        const name = createdResourcesID[j].split('/')[1]
        const urlFile = _.find(urlFiles, (file) => {
          return file.name === name
        })
        if (urlFile) {
          urlFile.id = id
        }
      }
      // Add resource-group-list
      this.referenceURLIntoMap(xmlDoc, urlFiles, folderId)
      const mapString = new XMLSerializer().serializeToString(xmlDoc)
      const blob = new window.Blob([mapString], {
        type: 'text/plain;charset=utf-8'
      })
      let name
      folderName ? name = folderName : name = window.abwa.groupSelector.currentGroup.name
      FileSaver.saveAs(blob, LanguageUtils.camelize(window.abwa.groupSelector.currentGroup.name) + '(' + window.abwa.groupSelector.currentGroup.id + ')' + '.cxl')
      Alerts.infoAlert({ text: 'You have available your resource in CmapCloud in ' + name + ' folder.\n Please move the downloaded map to the corresponding CmapCloud folder.', title: 'Completed' })
      // })
    }, reason => {
    })
  }

  static removeFolderResources (cmapCloudClient, folderId, callback) {
    chrome.runtime.sendMessage({ scope: 'cmapCloud', cmd: 'getFolderList', data: folderId }, (response) => {
      if (response.info) {
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(response.info, 'text/xml')
        console.log(xmlDoc)
        const list = xmlDoc.querySelector('res-meta-list')
        let identifiers = []
        Array.from(list.children).forEach(item => {
          Array.from(item.children).forEach(tag => {
            if (tag.nodeName === 'dc:identifier') {
              identifiers.push(tag)
            }
          })
        })
        const pattern = /id=([\w-]+)/
        if (identifiers) {
          identifiers = identifiers.map(identifier => {
            const match = identifier.innerHTML.match(pattern)
            // Check if a match was found and extract the desired string
            if (match) {
              return match[1]
            } else {
              return null
            }
          })
          console.log(identifiers)
          const beginDeletePromises = []
          for (let i = 0; i < identifiers.length; i++) {
            const identifier = identifiers[i]
            const beginPromise = new Promise((resolve, reject) => {
              cmapCloudClient.removeResource(identifier, (data) => {
                resolve(data)
              })
            })
            beginDeletePromises.push(beginPromise)
          }
          Promise.all(beginDeletePromises).then(deletedResources => {
            console.log(deletedResources)
            if (_.isFunction(callback)) {
              callback()
            }
          }, reason => {
          })
        } else {
          if (_.isFunction(callback)) {
            callback()
          }
        }
      } else {
        Alerts.infoAlert({ text: 'Folder not found', title: 'Info' })
      }
    })
  }
}

export default ExportCmapCloud
