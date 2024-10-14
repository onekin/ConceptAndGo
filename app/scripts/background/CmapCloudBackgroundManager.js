import _ from 'lodash'
import ChromeStorage from '../utils/ChromeStorage'

class CmapCloudBackgroundManager {
  init () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'cmapCloud') {
        if (request.cmd === 'getUserUid') {
          if (_.isString(request.data.user && request.data.password)) {
            const user = request.data.user
            const password = request.data.password
            this.getUid(user, password, (err, uid) => {
              if (err) {
                sendResponse({ err: err })
              } else {
                const userData = {}
                userData.user = user
                userData.password = password
                userData.uid = uid
                ChromeStorage.setData('cmapCloudUserData', { userData: userData }, ChromeStorage.sync, (err) => {
                  if (err) {
                    sendResponse({ err: err })
                  } else {
                    sendResponse({ userData: userData })
                  }
                })
              }
            })
          }
        } else if (request.cmd === 'getUserData') {
          ChromeStorage.getData('cmapCloudUserData', ChromeStorage.sync, (err, userData) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              sendResponse({ data: userData })
            }
          })
          return true // Async response
        } else if (request.cmd === 'getRootFolderInfo') {
          if (_.isString(request.data.uid)) {
            const uid = request.data.uid
            this.getRootFolderInfo(uid, (err, folderInfo) => {
              if (err) {
                sendResponse({ err: err })
              } else {
                const folderInfoXML = new XMLSerializer().serializeToString(folderInfo)
                sendResponse({ info: folderInfoXML })
              }
            })
          }
        } else if (request.cmd === 'getCXL') {
          if (_.isString(request.data.id)) {
            const cmapId = request.data.id
            this.getCXLFile(cmapId, (err, cxlFile) => {
              if (err) {
                sendResponse({ err: err })
              } else {
                cxlFile = new XMLSerializer().serializeToString(cxlFile)
                sendResponse({ info: cxlFile })
              }
            })
          }
        } else if (request.cmd === 'getFolderList') {
          if (_.isString(request.data)) {
            const folderId = request.data
            this.getFolderList(folderId, (err, response) => {
              if (err) {
                sendResponse({ err: err })
              } else {
                const result = new XMLSerializer().serializeToString(response)
                sendResponse({ info: result })
              }
            })
          }
        }
        return true // Async response
      }
    })
  }

  async getUid (user, password, callback) {
    try {
      // Construct the form data for the login request
      const formData = new URLSearchParams()
      formData.append('j_username', user)
      formData.append('j_password', password)
      formData.append('Submit', '')

      // Login request
      const loginResponse = await fetch('https://cmapcloud.ihmc.us/j_spring_security_check', {
        method: 'POST',
        headers: {
          Connection: 'keep-alive',
          'Cache-Control': 'max-age=0',
          'Upgrade-Insecure-Requests': '1',
          Origin: 'https://cmapcloud.ihmc.us',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-User': '?1',
          'Sec-Fetch-Dest': 'document',
          Referer: 'https://cmapcloud.ihmc.us/login.html',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        },
        body: formData
      })

      // Check if the login request was successful
      const loginText = await loginResponse.text()
      const parser = new DOMParser()
      const docPreferences = parser.parseFromString(loginText, 'text/html')
      const mapRepositoryElement = docPreferences.querySelector('a[href="/cmaps/myCmaps.html"]')

      if (!mapRepositoryElement) {
        return callback(new Error('Unable to do the login'))
      }

      // Fetch the UID from the /cmaps/myCmaps.html page
      const myCmapsResponse = await fetch('https://cmapcloud.ihmc.us/cmaps/myCmaps.html')
      const myCmapsText = await myCmapsResponse.text()

      // Extract the UID using regex
      const uidMatch = myCmapsText.match(/uid=[\s\S]*?ou=users/)
      if (uidMatch) {
        const uid = uidMatch[0].replace('uid=', '').replace(',ou=users', '')
        callback(null, uid)
      } else {
        callback(new Error('Unable to retrieve UID'))
      }
    } catch (error) {
      callback(error)
    }
  }

  getRootFolderInfo (uid, callback) {
    // Construct the URL
    const url = `https://cmapscloud.ihmc.us:443/resources/id=uid=${uid},ou=users,dc=cmapcloud,dc=ihmc,dc=us?cmd=get.compact.resmeta.list`

    // Use fetch to make the request
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok')
        }
        return response.text() // Use response.text() to handle XML or plain text
      })
      .then((xmlData) => {
        // Assuming you want to pass the XML response to the callback
        if (typeof callback === 'function') {
          callback(null, xmlData)
        }
      })
      .catch((error) => {
        // Pass the error to the callback if needed
        if (typeof callback === 'function') {
          callback(error, null)
        }
      })
  }

  getCXLFile (id, callback) {
    // Construct the URL
    const url = `https://cmapscloud.ihmc.us:443/resources/rid=${id}`
    // Use fetch to make the request
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok')
        }
        return response.text() // Use response.text() to get the raw XML data
      })
      .then((xmlData) => {
        // Assuming you want to pass the XML response to the callback
        if (typeof callback === 'function') {
          callback(null, xmlData)
        }
      })
      .catch((error) => {
        // Pass the error to the callback if needed
        if (typeof callback === 'function') {
          callback(error, null)
        }
      })
  }

  getFolderList (folderId, callback) {
    // Construct the URL
    const url = `https://cmapscloud.ihmc.us:443/resources/rid=${folderId}/?cmd=get.resmeta.list`

    // Use fetch to make the request
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok')
        }
        return response.text() // Use response.text() to handle XML or plain text
      })
      .then((xmlData) => {
        // Assuming you want to pass the XML response to the callback
        if (typeof callback === 'function') {
          callback(null, xmlData)
        }
      })
      .catch((error) => {
        // Pass the error to the callback if needed
        if (typeof callback === 'function') {
          callback(error, null)
        }
      })
  }
}

export default CmapCloudBackgroundManager
