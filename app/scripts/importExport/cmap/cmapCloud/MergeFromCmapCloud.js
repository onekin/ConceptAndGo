import CmapCloudClient from './CmapCloudClient'
import Alerts from '../../../utils/Alerts'
import AnnotationUtils from '../../../utils/AnnotationUtils'
import LanguageUtils from '../../../utils/LanguageUtils'
import CXLMerger from '../../../importExport/cmap/CXLMerger'

class MergeFromCmapCloud {
  static mergeFromCmapCloud (userData, mappingAnnotation) {
    const user = userData.user
    const pass = userData.password
    const uid = userData.uid
    const cmapCloudClient = new CmapCloudClient(user, pass, uid)
    if (mappingAnnotation) {
      const folderId = AnnotationUtils.getFolderIDFromAnnotation(mappingAnnotation)
      this.findMap(folderId, (map) => {
        CXLMerger.mergeCXLfile(map)
      })
    }
  }

  static findMap (folderId, callback) {
    chrome.runtime.sendMessage({ scope: 'cmapCloud', cmd: 'getFolderList', data: folderId }, (response) => {
      if (response.info) {
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(response.info, 'text/xml')
        console.log(xmlDoc)
        const list = xmlDoc.querySelector('res-meta-list')
        const identifiers = []
        Array.from(list.children).forEach(item => {
          Array.from(item.children).forEach(tag => {
            if (tag.nodeName === 'dc:format' && tag.innerHTML === 'x-cmap/x-storable') {
              identifiers.push(item)
            }
          })
        })
        console.log(identifiers)
        if (identifiers.length > 0) {
          const mapId = LanguageUtils.getMapIdFromArray(Array.from(identifiers[0].children))
          console.log(mapId)
          chrome.runtime.sendMessage({
            scope: 'cmapCloud',
            cmd: 'getCXL',
            data: { id: mapId }
          }, (response) => {
            if (response.info) {
              const parser = new DOMParser()
              const xmlDoc = parser.parseFromString(response.info, 'text/xml')
              callback(xmlDoc)
              // validated
            } else if (response.err) {
              // Not validated
              callback(null)
            }
          })
        } else {
          Alerts.errorAlert({ title: 'Error', text: 'Not maps found' })
        }
      } else {
        Alerts.errorAlert({ title: 'Error' })
      }
    })
  }
}

export default MergeFromCmapCloud
