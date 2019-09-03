// Google re-captcha package tweaked from http://github.com/haisum/recaptcha

package recaptcha

import (
	"encoding/json"
	"io/ioutil"
	"net/http"
	"net/url"
	"time"
)

// R type represents an object of Recaptcha and has public property Secret,
// which is secret obtained from google recaptcha tool admin interface
type R struct {
	Secret    string
	lastError []string
}

// Struct for parsing json in google's response
type googleResponse struct {
	Success    bool
	ErrorCodes []string `json:"error-codes"`
}

// url to post submitted re-captcha response to
var postURL = "https://www.google.com/recaptcha/api/siteverify"

// VerifyResponse is a method similar to `Verify`; but doesn't parse the form for you.  Useful if
// you're receiving the data as a JSON object from a javascript app or similar.
func (r *R) VerifyResponse(response string) bool {
	r.lastError = make([]string, 1)
	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.PostForm(postURL,
		url.Values{"secret": {r.Secret}, "response": {response}})
	if err != nil {
		r.lastError = append(r.lastError, err.Error())
		return false
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		r.lastError = append(r.lastError, err.Error())
		return false
	}
	gr := new(googleResponse)
	err = json.Unmarshal(body, gr)
	if err != nil {
		r.lastError = append(r.lastError, err.Error())
		return false
	}
	if !gr.Success {
		r.lastError = append(r.lastError, gr.ErrorCodes...)
	}
	return gr.Success
}

// LastError returns errors occurred in last re-captcha validation attempt
func (r R) LastError() []string {
	return r.lastError
}
