import _ from 'lodash'
import Alerts from '../../utils/Alerts'
import $ from 'jquery'
import Config from '../../Config'

class CommentingForm {
  /**
   *
   * @param annotation annotation that is involved
   * @param callback callback to execute after form is closed
   * @param addingHtml
   */
  static showCommentingForm (annotation, callback, addingHtml) {
    // Save status of sidebar and close it
    const sidebarStatus = window.abwa.sidebar.isOpened()
    window.abwa.sidebar.closeSidebar()
    const title = CommentingForm.getFormTitle(annotation)
    const showForm = (preConfirmData = {}) => {
      // Get last call to this form annotation text, not the init one
      if (_.isObject(preConfirmData) && preConfirmData.comment) {
        annotation.text = preConfirmData.comment
      }
      // Create form
      const generateFormObjects = { annotation, showForm, sidebarStatus }
      const html = CommentingForm.generateCommentFormHTML({ annotation, addingHtml })
      const swalCallback = CommentingForm.generateCommentFormCallback({ annotation, preConfirmData, sidebarStatus, callback })
      const preConfirm = CommentingForm.generateCommentFormPreConfirm({ preConfirmData, swalCallback, showForm })
      const onBeforeOpen = CommentingForm.generateOnBeforeOpenForm({ annotation })
      Alerts.multipleInputAlert({
        title: title || '',
        html: html,
        onBeforeOpen: onBeforeOpen,
        position: Alerts.position.bottom, // TODO Must be check if it is better to show in bottom or not
        callback: swalCallback,
        preConfirm: preConfirm
      })
    }
    showForm()
  }

  static getFormTitle (annotation) {
    let title = 'Commenting'
    // Get the title for form (if it is a classifying annotation, annotation code or theme
    // Get body for classifying
    let themeOrCode
    themeOrCode = CommentingForm.getCodeOrThemeForAnnotation(annotation)
    if (themeOrCode) {
      title = themeOrCode.name
    }
    return title
  }

  static getCodeOrThemeForAnnotation (annotation) {
    const classifyingBody = annotation.getBodyForPurpose('classifying')
    let themeOrCode
    if (classifyingBody) {
      themeOrCode = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(classifyingBody.value.id)
    }
    return themeOrCode
  }


  static generateCommentFormPreConfirm ({ preConfirmData, callback, showForm }) {
    const preConfirm = () => {
      preConfirmData.comment = document.querySelector('#comment').value
    }
    return preConfirm
  }


  static generateCommentFormHTML ({ annotation, addingHtml }) {
    let html = addingHtml || ''
    let purposeCommentingBody
    if (_.isArray(annotation.body)) {
      purposeCommentingBody = annotation.body.find(body => body.purpose === 'commenting')
    }
    const commentText = purposeCommentingBody ? purposeCommentingBody.value : ''
    html += '<textarea class="swal2-textarea" data-minchars="1" data-multiple id="comment" rows="6" autofocus>' + commentText + '</textarea>'
    return html
  }

  static generateOnBeforeOpenForm ({ annotation }) {
    // On before open
    let onBeforeOpen = () => {
    }
    return onBeforeOpen
  }


  static generateCommentFormCallback ({ annotation, preConfirmData, callback, sidebarStatus }) {
    // Callback
    return (err, result) => {
      if (!_.isUndefined(preConfirmData.comment)) { // It was pressed OK button instead of cancel, so update the annotation
        if (err) {
          window.alert('Unable to load alert. Is this an annotable document?')
        } else {
          const bodyToUpdate = []
          bodyToUpdate.push(new Commenting({ value: preConfirmData.comment }))
          // Update annotation
          annotation.text = preConfirmData.comment || ''
          // Update annotation's body
          annotation.body = _.uniqBy(_.concat(bodyToUpdate, annotation.body), a => a.purpose)
          if (sidebarStatus) {
            window.abwa.sidebar.openSidebar()
          }
          if (_.isFunction(callback)) {
            callback(null, annotation)
          }
        }
      }
    }
  }
}

export default CommentingForm
