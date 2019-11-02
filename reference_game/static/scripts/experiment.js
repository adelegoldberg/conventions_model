/*globals $, dallinger */
const ws_scheme = (window.location.protocol === "https:") ? 'wss://' : 'ws://';

class CoordinationChatRoomClient {
  constructor() {
    this.socket = new ReconnectingWebSocket(
      ws_scheme + window.location.host + "/chat?channel=chat"
    );
    this.my_node_id = '';
    this.im_old = 'blah blah blah';
    this.messageSent = false;
    this.alreadyClicked = false;
    this.createAgent();
    this.initializeStimGrid();
    this.setupHandlers();
  }

  createAgent() {
    self = this;
    dallinger.createAgent()
      .done(resp => {
	self.my_node_id = resp.node.id;
	console.log(this);
	console.log('done changing node id');
	$("#chat-history").show();
	$("#response-form").show();
	$("#send-message").removeClass("disabled");
	$("#send-message").html("Send");
	$("#reproduction").focus();
      })
      .fail(rejection => {
	// A 403 is our signal that it's time to go to the questionnaire
	if (rejection.status === 403) {
          dallinger.allowExit();
          dallinger.goToPage('questionnaire');
	} else {
          dallinger.error(rejection);
	}
      });
  }

  initializeStimGrid() {
    const currStim = [
      {url: 'tangram_A.png', targetStatus: 'target'},
      {url: 'tangram_B.png', targetStatus: 'distractor1'},
      {url: 'tangram_C.png', targetStatus: 'distractor2'}
    ];
    _.forEach(currStim, (stim, i) => {
      const bkg = 'url(./static/images/' + stim.url + ')';
      const div = $('<div/>')
	  .addClass('pressable')
	  .attr({'id' : stim.targetStatus})
	  .css({'background' : bkg})
	  .css({
	    'position': 'relative',
	    'grid-row': 1, 'grid-column': i+1,
	    'background-size' :'cover'
	  });
      $("#object-grid").append(div);
    });
  };

  handleChatReceived (msg) {
    console.log(this);
    this.messageSent = true;
    console.log(this);
    $("#story")
      .append("<p>" + msg.content + "</p>")
      .stop(true,true)
      .animate({
	scrollTop: $("#story").prop("scrollHeight")
      }, 800);
  }

  sendMessage (msg) {
    console.log(this);
    this.im_old = 'not anymore';
    $("#send-message").addClass("disabled");
    $("#send-message").html("Sending...");
    $("#reproduction").val("");
    $("#reproduction").focus();
    if(msg != '') {
      this.socket.send('chat:' + JSON.stringify({
	'type' : 'chatMessage', 'content' : msg
      }));
    }
    $("#send-message").removeClass("disabled");
    $("#send-message").html("Send");
  }

  sendResponse(id) {
    console.log(this);
    if(this.messageSent & !this.alreadyClicked) {
      const clickedId = id;
      this.alreadyClicked = true;
      this.socket.send('chat:' + JSON.stringify({
	'type' : 'clickedObj', 'objectID' : clickedId
      }));
    }
  }
  
  setupHandlers() {
    // Handle messages sent from the server
    self = this;
    this.socket.onmessage = e => {
      const rawMessage = e.data;
      const handlers = {'chatMessage' : self.handleChatReceived.bind(this)};
      if(rawMessage.startsWith("chat:")) {
	const body = JSON.parse(rawMessage.replace("chat:", ""));
	if(handlers.hasOwnProperty(body.type)) {
	  handlers[body.type](body);
	} else {
	  console.log("Received mysterious message", rawMessage);
	}
      }
    };
    
    // Send whatever is in the chatbox when button clicked
    $("#send-message").click(() => {
      const msg = $("#reproduction").val();
      self.sendMessage(msg);
    });
    
    $('div.pressable').click(event => {
      // Only let listener click once they've heard answer back
      self.sendResponse(event.target.id);
    });

    // Leave the chatroom.
    $("#leave-chat").click(function() {
      dallinger.goToPage("questionnaire");
    });
  }
}

$(document).keypress(e => {
  if (e.which === 13) {
    $("#send-message").click();
    return false;
  }
});

$(document).ready(() => {
  console.log('ready');
  new CoordinationChatRoomClient();
});
