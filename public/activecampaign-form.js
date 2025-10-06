window.cfields = [];
window._show_thank_you = function (id, message, trackcmp_url, email) {
  var form = document.getElementById("_form_" + id + "_"),
    thank_you = form.querySelector("._form-thank-you");
  form.querySelector("._form-content").style.display = "none";
  thank_you.innerHTML = message;
  thank_you.style.display = "block";
  const vgoAlias =
    typeof visitorGlobalObjectAlias === "undefined"
      ? "vgo"
      : visitorGlobalObjectAlias;
  var visitorObject = window[vgoAlias];
  if (email && typeof visitorObject !== "undefined") {
    visitorObject("setEmail", email);
    visitorObject("update");
  } else if (typeof trackcmp_url != "undefined" && trackcmp_url) {
    _load_script(trackcmp_url);
  }
  if (typeof window._form_callback !== "undefined") window._form_callback(id);

  // Call ActiveCampaign API to add contact to list
  if (email) {
    // First, get the contact ID by email
    const contactUrl = `https://remalt.activehosted.com/api/3/contacts?email=${encodeURIComponent(
      email
    )}`;
    const apiToken =
      "e53bd600cdd60e801e9f255b9ff303caf66469c4046859b12baf69533a630079a0acfb7e";

    fetch(contactUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
        "Api-Token": apiToken,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.contacts && data.contacts.length > 0) {
          const contactId = data.contacts[0].id;
          const listId = "1"; // Replace with your actual list ID

          // Now subscribe the contact to the list
          const subscribeUrl =
            "https://remalt.activehosted.com/api/3/contactLists";
          const options = {
            method: "POST",
            headers: {
              accept: "application/json",
              "content-type": "application/json",
              "Api-Token": apiToken,
            },
            body: JSON.stringify({
              contactList: {
                list: listId,
                contact: contactId,
                status: 1, // 1 = subscribed, 2 = unsubscribed
              },
            }),
          };

          return fetch(subscribeUrl, options);
        } else {
          throw new Error("Contact not found");
        }
      })
      .then((res) => res.json())
      .then((json) => console.log("Contact added to list:", json))
      .catch((err) => console.error("Error adding contact to list:", err));
  }
};

window._show_error = function (id, message, html) {
  var form = document.getElementById("_form_" + id + "_"),
    err = document.createElement("div"),
    button = form.querySelector('button[type="submit"]'),
    old_error = form.querySelector("._form_error");
  if (old_error) old_error.parentNode.removeChild(old_error);
  err.innerHTML = message;
  err.className = "_error-inner _form_error _no_arrow";
  var wrapper = document.createElement("div");
  wrapper.className = "_form-inner _show_be_error";
  wrapper.appendChild(err);
  button.parentNode.insertBefore(wrapper, button);
  var submitButton = form.querySelector('[id^="_form"][id$="_submit"]');
  submitButton.disabled = false;
  submitButton.classList.remove("processing");
  if (html) {
    var div = document.createElement("div");
    div.className = "_error-html";
    div.innerHTML = html;
    err.appendChild(div);
  }
};

window._load_script = function (url, callback, isSubmit) {
  var head = document.querySelector("head"),
    script = document.createElement("script"),
    r = false;
  var submitButton = document.querySelector("#_form_1_submit");
  script.charset = "utf-8";
  script.src = url;
  if (callback) {
    script.onload = script.onreadystatechange = function () {
      if (!r && (!this.readyState || this.readyState == "complete")) {
        r = true;
        callback();
      }
    };
  }
  script.onerror = function () {
    if (isSubmit) {
      if (script.src.length > 10000) {
        _show_error(
          "1",
          "Sorry, your submission failed. Please shorten your responses and try again."
        );
      } else {
        _show_error("1", "Sorry, your submission failed. Please try again.");
      }
      submitButton.disabled = false;
      submitButton.classList.remove("processing");
    }
  };
  head.appendChild(script);
};

(function () {
  if (window.location.search.search("excludeform") !== -1) return false;

  var form_to_submit = document.getElementById("_form_1_");
  if (!form_to_submit) return;

  var allInputs = form_to_submit.querySelectorAll("input, select, textarea"),
    submitted = false;

  var validate_field = function (elem) {
    var value = elem.value,
      no_error = true;
    elem.className = elem.className.replace(/ ?_has_error ?/g, "");

    if (elem.getAttribute("required") !== null) {
      if (elem.type == "checkbox") {
        if (!elem.checked) {
          elem.className = elem.className + " _has_error";
          no_error = false;
        }
      } else if (value === undefined || value === null || value === "") {
        elem.className = elem.className + " _has_error";
        no_error = false;
      }
    }

    if (no_error && elem.name == "email") {
      if (
        !value.match(
          /^[\+_a-z0-9-'&=]+(\.[\+_a-z0-9-']+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,})$/i
        )
      ) {
        elem.className = elem.className + " _has_error";
        no_error = false;
      }
    }

    return no_error;
  };

  var validate_form = function (e) {
    var no_error = true;

    if (!submitted) {
      submitted = true;
      for (var i = 0, len = allInputs.length; i < len; i++) {
        var input = allInputs[i];
        if (input.getAttribute("required") !== null || input.name === "email") {
          if (input.type == "text" || input.type == "email") {
            input.addEventListener("blur", function () {
              this.value = this.value.trim();
              validate_field(this);
            });
          }
        }
      }
    }

    for (var i = 0, len = allInputs.length; i < len; i++) {
      var elem = allInputs[i];
      if (elem.getAttribute("required") !== null || elem.name === "email") {
        elem.value = elem.value.trim();
        validate_field(elem) ? true : (no_error = false);
      }
    }

    if (!no_error && e) {
      e.preventDefault();
    }
    return no_error;
  };

  var _form_serialize = function (form) {
    if (!form || form.nodeName !== "FORM") return;
    var i,
      q = [];
    for (i = 0; i < form.elements.length; i++) {
      if (form.elements[i].name === "") continue;
      switch (form.elements[i].nodeName) {
        case "INPUT":
          switch (form.elements[i].type) {
            case "text":
            case "email":
            case "hidden":
              q.push(
                form.elements[i].name +
                  "=" +
                  encodeURIComponent(form.elements[i].value)
              );
              break;
          }
          break;
      }
    }
    return q.join("&");
  };

  var form_submit = function (e) {
    e.preventDefault();
    console.log("Form submit triggered");

    if (validate_form()) {
      console.log("Form validation passed");
      var submitButton = document.getElementById("_form_1_submit");
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.classList.add("processing");
      }

      var serialized = _form_serialize(document.getElementById("_form_1_"));
      console.log("Serialized data:", serialized);

      _load_script(
        "https://remalt.activehosted.com/proc.php?" +
          serialized +
          "&jsonp=true",
        null,
        true
      );
    } else {
      console.log("Form validation failed");
    }
    return false;
  };

  if (form_to_submit) {
    form_to_submit.addEventListener("submit", form_submit);
    console.log("Form submit listener attached");
  }
})();
