/* html-keyboard-response — jsPsych 8.3.0 용 최소 호환 구현 (이 프로젝트 자체 코드)
   원본(@jspsych/plugin-html-keyboard-response 2.2.0)과 같은 이름(jsPsychHtmlKeyboardResponse)·
   같은 매개변수(stimulus, choices, prompt, stimulus_duration, trial_duration, response_ends_trial)를 지원합니다.
   인터넷(CDN) 없이도 실행되도록 vendor 폴더에 함께 넣었습니다. */
var jsPsychHtmlKeyboardResponse = (function (jspsych) {
  "use strict";
  const PT = jspsych.ParameterType;
  const info = {
    name: "html-keyboard-response",
    version: "local-1.0",
    parameters: {
      stimulus: { type: PT.HTML_STRING, default: undefined },
      choices: { type: PT.KEYS, default: "ALL_KEYS" },
      prompt: { type: PT.HTML_STRING, default: null },
      stimulus_duration: { type: PT.INT, default: null },
      trial_duration: { type: PT.INT, default: null },
      response_ends_trial: { type: PT.BOOL, default: true },
    },
    data: {
      response: { type: PT.STRING },
      rt: { type: PT.INT },
      stimulus: { type: PT.HTML_STRING },
    },
  };
  class HtmlKeyboardResponsePlugin {
    constructor(jsPsych) { this.jsPsych = jsPsych; }
    trial(display_element, trial) {
      let html = '<div id="jspsych-html-keyboard-response-stimulus">' + trial.stimulus + "</div>";
      if (trial.prompt !== null) html += trial.prompt;
      display_element.innerHTML = html;
      const response = { rt: null, key: null };
      const end_trial = () => {
        if (typeof keyboard_listener !== "undefined") this.jsPsych.pluginAPI.cancelKeyboardResponse(keyboard_listener);
        const trial_data = { rt: response.rt, stimulus: trial.stimulus, response: response.key };
        this.jsPsych.finishTrial(trial_data);
      };
      const after_response = (info) => {
        display_element.querySelector("#jspsych-html-keyboard-response-stimulus").className += " responded";
        if (response.key === null) response = info;
        if (trial.response_ends_trial) end_trial();
      };
      let keyboard_listener;
      if (trial.choices != "NO_KEYS") {
        keyboard_listener = this.jsPsych.pluginAPI.getKeyboardResponse({
          callback_function: after_response, valid_responses: trial.choices,
          rt_method: "performance", persist: false, allow_held_key: false,
        });
      }
      if (trial.stimulus_duration !== null) {
        this.jsPsych.pluginAPI.setTimeout(() => {
          const el = display_element.querySelector("#jspsych-html-keyboard-response-stimulus");
          if (el) el.style.visibility = "hidden";
        }, trial.stimulus_duration);
      }
      if (trial.trial_duration !== null) this.jsPsych.pluginAPI.setTimeout(end_trial, trial.trial_duration);
    }
  }
  HtmlKeyboardResponsePlugin.info = info;
  return HtmlKeyboardResponsePlugin;
})(jsPsychModule);
