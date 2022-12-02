import axios from 'axios'
import _ from 'lodash'
import ChromeStorage from '../utils/ChromeStorage'
import $ from 'jquery'

class SeroBackgroundManager {
  init () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'sero') {
        if (request.cmd === 'login') {
          if (_.isString(request.data.user && request.data.password)) {
            let user = request.data.user
            let password = request.data.password
            this.login(user, password, (err) => {
              if (err) {
                sendResponse({ err: err })
              } else {
                let seroUserData = {}
                seroUserData.user = user
                seroUserData.password = password
                ChromeStorage.setData('seroUserData', { seroUserData: seroUserData }, ChromeStorage.sync, (err) => {
                  if (err) {
                    sendResponse({ err: err })
                  } else {
                    sendResponse({ seroUserData: seroUserData })
                  }
                })
              }
            })
          }
        } else if (request.cmd === 'getSeroUserData') {
          ChromeStorage.getData('seroUserData', ChromeStorage.sync, (err, seroUserData) => {
            if (err) {
              sendResponse({ err: err })
            } else {
              sendResponse({ data: seroUserData })
            }
          })
          return true // Async response
        }
        return true // Async response
      }
    })
  }

  login (user, password, callback) {
    // Open preferences page
    let preLoginData = {
      email: user
    }
    fetch('https://api.serolearn.com/prelogin', {
      headers: {
        accept: 'application/json, text/plain, */*',
        'accept-language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
        'content-type': 'application/json',
        'sec-ch-ua': '"Not?A_Brand";v="8", "Chromium";v="108", "Google Chrome";v="108"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        Referer: 'https://serolearn.com/',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      },
      body: JSON.stringify(preLoginData),
      method: 'POST'
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('Success:', data)
        if (data.type === 'error') {
          callback(new Error(data.text))
        } else {
          let loginData = {
            un: user,
            pw: password
          }
          fetch('https://api.serolearn.com/login', {
            headers: {
              accept: 'application/json, text/plain, */*',
              'accept-language': 'es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7',
              'content-type': 'application/json',
              'sec-ch-ua': '"Not?A_Brand";v="8", "Chromium";v="108", "Google Chrome";v="108"',
              'sec-ch-ua-mobile': '?0',
              'sec-ch-ua-platform': '"macOS"',
              'sec-fetch-dest': 'empty',
              'sec-fetch-mode': 'cors',
              'sec-fetch-site': 'same-site',
              Referer: 'https://serolearn.com/',
              'Referrer-Policy': 'strict-origin-when-cross-origin'
            },
            body: JSON.stringify(loginData),
            method: 'POST'
          }).then((response) => response.json())
            .then((data) => {
              console.log('Success:', data)
              if (data.error) {
                callback(new Error(data.error))
              } else {
                callback(null)
              }
            })
            .catch((error) => {
              console.error('Error:', error)
              callback(new Error('Unable to login'))
            })
        }
      })
      .catch((error) => {
        console.error('Error:', error)
        callback(new Error('Unable to login'))
      })
  }
}

export default SeroBackgroundManager

