import LinkingForm from './LinkingForm'

class LinkingButton {
  static createNewLinkButton () {
    let newLinkingButton = document.createElement('button')
    newLinkingButton.innerText = '+ Relation'
    newLinkingButton.id = 'newRelationButton'
    newLinkingButton.className = 'tagButton codingElement'
    newLinkingButton.style.fontSize = '17px'
    newLinkingButton.addEventListener('click', () => {
      let annotation
      LinkingForm.showLinkingForm(null)
    })
    window.abwa.codebookManager.codebookReader.buttonContainer.append(newLinkingButton)
  }
}

export default LinkingButton
