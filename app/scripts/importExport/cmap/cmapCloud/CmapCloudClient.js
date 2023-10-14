import _ from 'lodash'
import LanguageUtils from '../../../utils/LanguageUtils'
import $ from 'jquery'
import Alerts from '../../../utils/Alerts'

class CmapCloudClient {
  constructor (user, password, uid) {
    this.user = user
    this.password = password
    this.uid = uid
    const auth = user + ':' + password
    this.basicAuth = btoa(auth)
  }

  getRootFolderInfor (callback) {
    chrome.runtime.sendMessage({
      scope: 'cmapCloud',
      cmd: 'getRootFolderInfo',
      data: { uid: this.uid }
    }, (response) => {
      if (response.info) {
        let parser = new DOMParser()
        let xmlDoc = parser.parseFromString(response.info, 'text/xml')
        callback(xmlDoc)
        // validated
      } else if (response.err) {
        // Not validated
        callback(null)
      }
    })
  }

  createFolder (folderName, callback) {
    const settings = {
      url: 'https://cmapscloud.ihmc.us:443/resources/id=uid=' + this.uid + ',ou=users,dc=cmapcloud,dc=ihmc,dc=us/?cmd=create.folder.with.name&name=' + folderName + '&userDN=uid=' + this.uid + ',ou=users,dc=cmapcloud,dc=ihmc,dc=us',
      method: 'POST',
      timeout: 0,
      headers: {
        Authorization: 'Basic ' + this.basicAuth,
        'Content-Type': 'application/xml'
      },
      data: '<res-meta xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:vCard="http://www.w3.org/2001/vcard-rdf/3.0#">\n' +
        '<dc:title>CreateFolder</dc:title>\n' +
        '<dc:format>x-nlk-project/x-binary</dc:format>\n' +
        '<dc:description>No description</dc:description>\n' +
        '<dc:creator>\n' +
        '\t<vCard:FN>uid=' + this.uid + ',ou=users,dc=cmapcloud,dc=ihmc,dc=us</vCard:FN>\n' +
        '\t<vCard:EMAIL />\n' +
        '</dc:creator>\n' +
        '<dcterms:rightsHolder>\n' +
        '\t<vCard:FN>uid=' + this.uid + ',ou=users,dc=cmapcloud,dc=ihmc,dc=us</vCard:FN>\n' +
        '\t<vCard:EMAIL />\n' +
        '</dcterms:rightsHolder>\n' +
        '</res-meta>\n' +
        '\n' +
        '<acl-info inherit="true" />'
    }

    $.ajax(settings).done(function (response) {
      if (_.isFunction(callback)) {
        callback(response)
      }
    })
  }

  uploadWebResource (folderID, resource, callback) {
    const settings = {
      url: 'https://cmapscloud.ihmc.us:443/resources/rid=' + folderID + '/?cmd=begin.creating.resource',
      method: 'POST',
      timeout: 0,
      headers: {
        Authorization: 'Basic ' + this.basicAuth,
        'Content-Type': 'application/xml'
      },
      data: '<res-meta xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">\n' +
        '<dc:title>' + resource.name + '</dc:title>\n' +
        '<dc:description>No description</dc:description>\n' +
        '<dc:format>text/x-url</dc:format>\n' +
        '</res-meta>'
    }

    $.ajax(settings).done((token) => {
      this.uploadWebResourceBody(token, resource, callback)
    })
  }

  uploadWebResourceBody (token, resource, callback) {
    const settings = {
      url: 'https://cmapscloud.ihmc.us:443/resources/rid=' + token + '/?cmd=write.resource.part&partname=url&mimetype=text/x-url',
      method: 'POST',
      timeout: 0,
      headers: {
        Authorization: 'Basic ' + this.basicAuth,
        'Content-Type': 'text/plain'
      },
      data: resource.direction + '\n' +
        '[DEFAULT]\n' +
        'BASEURL=' + resource.direction + '\n' +
        '[InternetShortcut]\n' +
        'URL=' + resource.direction
    }

    $.ajax(settings).done((response) => {
      this.uploadConfirm(token, callback)
    })
  }

  uploadConfirm (token, callback) {
    const settings = {
      url: 'https://cmapscloud.ihmc.us:443/resources/rid=' + token + '/?cmd=done.saving.resource',
      method: 'POST',
      timeout: 0
    }

    $.ajax(settings).done(function (response) {
      if (_.isFunction(callback)) {
        callback(response)
      }
    })
  }

  uploadMap (folderID, xmlMap, callback, group, dimensions) {
    const map = new XMLSerializer().serializeToString(xmlMap)
    let description = ''
    Array.from(xmlMap.children[0].children[0].children).forEach(tag => {
      if (tag.nodeName === 'dc:description') {
        description = tag.innerHTML
      }
    })
    let language = ''
    Array.from(xmlMap.children[0].children[0].children).forEach(tag => {
      if (tag.nodeName === 'dc:language') {
        language = tag.innerHTML
      }
    })
    let title = ''
    if (group) {
      title = LanguageUtils.camelize(group.name) + '(' + group.id + ')'
    } else {
      title = LanguageUtils.camelize(window.abwa.groupSelector.currentGroup.name) + '(' + window.abwa.groupSelector.currentGroup.id + ')'
    }
    const settings = {
      url: 'https://cmapscloud.ihmc.us:443/resources/rid=' + folderID + '/?cmd=begin.creating.resource',
      method: 'POST',
      timeout: 0,
      headers: {
        Authorization: 'Basic ' + this.basicAuth,
        'Content-Type': 'application/xml'
      },
      data: '<res-meta xmlns:dcterms="http://purl.org/dc/terms/" xmlns="http://cmap.ihmc.us/xml/cmap/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:vcard="http://www.w3.org/2001/vcard-rdf/3.0#"> ' + '\n' +
        '<dc:title>' + title + '</dc:title>\n' +
        '<dc:description>' + description + '</dc:description>\n' +
        '<dc:subject>' + dimensions + '</dc:subject>\n' +
        '<dc:language>' + language + '</dc:language>' +
        '<dc:format>x-cmap/x-storable</dc:format>\n' +
        '<dc:contributor><vcard:FN>' + group.id + '</vcard:FN></dc:contributor>' +
        '<dc:creator><vcard:FN>' + group.id + '</vcard:FN></dc:creator>' +
        '</res-meta>'
    }

    $.ajax(settings).done((token) => {
      this.uploadMapBody(token, map, callback)
    })
  }

  uploadMapBody (token, map, callback) {
    const settings = {
      url: 'https://cmapscloud.ihmc.us:443/resources/rid=' + token + '/?cmd=write.resource.part&partname=cmap&mimetype=XML',
      method: 'POST',
      timeout: 0,
      headers: {
        Authorization: 'Basic ' + this.basicAuth,
        'Content-Type': 'text/plain'
      },
      data: map
    }

    $.ajax(settings).done((response) => {
      this.uploadConfirm(token, callback)
    })
  }

  removeResource (id, callback) {
    const settings = {
      url: 'https://cmapscloud.ihmc.us:443/resources/rid=' + id + '/?cmd=delete.resource',
      method: 'GET',
      timeout: 0,
      headers: {
        Authorization: 'Basic ' + this.basicAuth,
        'Content-Type': 'text/plain'
      }
    }
    $.ajax(settings).done((response) => {
      if (_.isFunction(callback)) {
        callback(response)
      }
    })
      .fail((jqXHR, textStatus, errorThrown) => {
        // Handle the error here
        console.error('AJAX request failed:', errorThrown)
        Alerts.errorAlert({ title: 'Error updating concept map', text: 'Please, close the concept map you want to update in CmapCloud' })
        // You can also call a separate error handling function here if needed
      })
  }
}

export default CmapCloudClient
