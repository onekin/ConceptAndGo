import _ from 'lodash'
import LanguageUtils from '../../../utils/LanguageUtils'
import $ from 'jquery'

class SeroClient {
  constructor (user, password, uid) {
    this.user = user
    this.password = password
    let auth = user + ':' + password
    this.basicAuth = btoa(auth)
  }

  createMap (map, callback) {
    let settings = {
      url: 'https://api.serolearn.com/1.0/create-cmap/cxl',
      method: 'POST',
      timeout: 0,
      headers: {
        Authorization: 'Basic ' + this.basicAuth,
        'Content-Type': 'application/xml'
      },
      data: map
    }

    $.ajax(settings).done((response) => {
      if (_.isFunction(callback)) {
        callback(response)
      }
    })
  }
}

export default SeroClient
