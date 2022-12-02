import SeroClient from './SeroClient'
import _ from 'lodash'
import Alerts from '../../../utils/Alerts'
import LanguageUtils from '../../../utils/LanguageUtils'
import FileSaver from 'file-saver'

class ExportSero {
  static export (xmlDoc, userData) {
    let user = userData.user
    let pass = userData.password
    let seroClient = new SeroClient(user, pass)
    let mapString = new XMLSerializer().serializeToString(xmlDoc)
    seroClient.createMap(mapString, (data) => {
      if (data.ok) {
        Alerts.infoAlert({
          title: 'Sero!',
          text: 'Your concept map has been uploaded successfully'
        })
        window.open('https://serolearn.com/sero-app/dashboard')
      } else {
        Alerts.infoAlert({
          title: 'Sero!',
          text: 'There has been an error during the export process'
        })
      }
    })
  }

}

export default ExportSero
