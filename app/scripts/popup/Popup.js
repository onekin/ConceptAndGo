class Popup {
  constructor (tabId) {
    this.activated = false
    this.tabId = tabId
  }

  deactivate () {
    this.activated = false
    chrome.tabs.sendMessage(this.tabId, { action: 'destroyContentScript' })
  }

  activate () {
    this.activated = true
    chrome.tabs.sendMessage(this.tabId, { action: 'initContentScript' })
  }
}

export default Popup
