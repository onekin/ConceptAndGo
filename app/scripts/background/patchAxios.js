/**
 * Patch the axios instance bundled inside hypothesis-api-client to use the
 * Fetch API instead of XMLHttpRequest.
 *
 * Chrome MV3 service workers have no XMLHttpRequest, so Axios 0.26.x ends up
 * with no adapter and every API call silently fails. fetch() IS available in
 * service workers, so we swap the adapter here before any HypothesisClient is
 * instantiated.
 */
const axios = require('hypothesis-api-client/node_modules/axios')

const META_KEYS = new Set(['common', 'delete', 'get', 'head', 'options', 'post', 'put', 'patch'])

axios.defaults.adapter = (config) => {
  // Merge axios header layers (common + method-specific + explicit) into a flat object
  const methodKey = (config.method || 'get').toLowerCase()
  const headers = Object.assign(
    {},
    config.headers.common || {},
    config.headers[methodKey] || {}
  )
  Object.keys(config.headers).forEach(k => {
    if (!META_KEYS.has(k)) headers[k] = config.headers[k]
  })

  const fetchConfig = {
    method: (config.method || 'GET').toUpperCase(),
    headers
  }
  // Serialize query params into the URL. The axios XHR adapter does this
  // automatically; the fetch adapter must do it manually. The hypothesis
  // client passes search filters (group, url, tags, order, limit...) here,
  // so without this step every search silently became an unfiltered global
  // search.
  let url = config.url
  if (config.params && typeof config.params === 'object') {
    const queryString = Object.keys(config.params)
      .filter((key) => config.params[key] !== undefined && config.params[key] !== null)
      .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(config.params[key]))
      .join('&')
    if (queryString) {
      url += (url.indexOf('?') !== -1 ? '&' : '?') + queryString
    }
  }
  // fetch() throws for GET/HEAD requests with a body (XHR silently ignored it),
  // so only attach the body for methods that support it.
  if (config.data !== undefined && config.data !== null &&
      fetchConfig.method !== 'GET' && fetchConfig.method !== 'HEAD') {
    fetchConfig.body = config.data
  }

  return fetch(url, fetchConfig).then(response =>
    response.text().then(text => {
      let data = text
      try { data = JSON.parse(text) } catch (_) {}
      const res = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: {},
        config,
        request: null
      }
      response.headers.forEach((value, key) => { res.headers[key] = value })
      if (response.status >= 200 && response.status < 300) {
        return res
      }
      // Reject with an Axios-compatible error shape
      const error = new Error('Request failed with status code ' + response.status)
      error.config = config
      error.response = res
      return Promise.reject(error)
    })
  )
}
