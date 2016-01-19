/*
 * This is a Heavy Metal FrameWork
 * Autor: Rafael Alexandre Piemontez
 * Version: 0.1
 */

/**
 * This Library Required adapter.js for crossbrowser solution Download
 * adapter.js in https://github.com/webrtc/adapter
 */

(function(){

var LP = this.LP = function() {};
var isTrace = true;

var socketConstraint = {
	'securite'	: 'ws',
	'host'		: 'localhost',
	'port'		: '8080',
	'key'		: 'ws',
	uri: function() {
		return this.securite + '://' + this.host + ':' + this.port + '/' + this.key;
	}
}

var servers = {
	"iceServers": [
		{"url": "stun:stun.l.google.com:19302"}
	]
};
var pcConstraints = {
	'optional': []
};
var offerOptions = {
	offerToReceiveAudio: 1,
	offerToReceiveVideo: 0,
	voiceActivityDetection: false
};
var mediaConstraints = {
	video: false,
	audio: true
};

function error(err) {
	console.error(err);
}
function trace(obj, msg) {
	if (isTrace) {
		if (msg === undefined) {
			console.log(obj);
		}
	}
}
/*
 * Observer
 */

function Observer() {
    this.handlers = [];
};
Observer.prototype = {
    subscribe: function(fn) {
        this.handlers.push(fn);
    },
    unsubscribe: function(fn) {
        this.handlers = this.handlers.filter(
            function(item) {
                if (item !== fn) {
                    return item;
                }
            }
        );
    },
    fire: function(o, thisObj) {
        var scope = thisObj || window;
        this.handlers.forEach(function(item) {
            item.call(scope, o);
        });
    }
};

/*
 * Peer
 */

LP.Peer = function() {
	this.obs = [];
	this._token = null;
	this._description= null;
	this._candidates	= [];
	this.connection	= null;
}
LP.Peer.init = function(token) {
	trace('Starting Peer');

	var peer = new LP.Peer();
	if (token !== undefined) { 
		peer._token = token;
	}

	peer.obs['addstream']		= new Observer();
	peer.obs['createoffer']		= new Observer();
	peer.obs['createanswer']	= new Observer();
	peer.obs['icecandidate']	= new Observer();
	peer.obs['setremotedescription'] = new Observer();
	
	peer.on('icecandidate', function(event) {
		peer.onicecandidate(event);
	});
	
	peer.connection = new RTCPeerConnection(servers, pcConstraints);
	peer.connection.onicecandidate = function(event) {
		trace('On Ice Candidate');
		peer.obs['icecandidate'].fire(event);
	};
	peer.connection.onaddstream = function(event) {
		trace('On Add Stream');
		peer.obs['addstream'].fire(event);
	};
	
	return peer;
};

LP.Peer.prototype = {

	on: function(ev, func) {
		this.obs[ev].subscribe(func);
	},
	
	stop: function() {
		this.connection.close();
	},

	onicecandidate: function(event) 
	{
		this._candidates.push(event.candidate);
	},
	
	description: function() {
		return this._description;
	},

	addStream: function(localStream) {
		this.connection.addStream(localStream);
	},

	createOffer: function() {
		var peer = this;
		this.connection.createOffer(function(desc) {
			trace('Offer created for peer connection\n' + desc.sdp);
			peer.obs['createoffer'].fire(desc)

		},error,  offerOptions);
	},

	createAnswer: function() {
		var peer = this;
		this.connection.createAnswer(function(desc) {
			trace('Answer created for peer connection\n' + desc.sdp);
			peer.obs['createanswer'].fire(desc)

		},error);
	},
	
	setLocalDescription: function(desc)
	{
		this._description = desc;
		this.connection.setLocalDescription(desc);
	},
	
	setRemoteDescription: function(sdp) {
		var desc = new RTCSessionDescription(sdp);
		var peer = this;
		this.connection.setRemoteDescription(desc, function() {
			trace('Remote description changed')
			peer.obs['setremotedescription'].fire();
		}, error);
	},

	candidates: function() {
		return this._candidates;
	},

	addRemoteIceCandidate: function(candidate) {
		this.connection.addIceCandidate(new RTCIceCandidate(candidate),
			function() {
				trace('ICE candidate added');
			}, 
			function () {
				trace('ICE candidate not added');
		});
	},

	token: function() {
		return this._token;
	},

	generateToken: function() {
		return this._token = Math.random();
	}
}

/*
 * Socket
 */

LP.Socket = function() {
	this.obs = [];
	this.websocket = null;
}

LP.Socket.init = function() {
	trace('Starting Socket');

	var socket = new LP.Socket();
	socket.obs['open'] = new Observer();
	socket.obs['close'] = new Observer();
	socket.obs['message'] = new Observer();
	socket.obs['error'] = new Observer();
    
	var websocket = socket.websocket = new WebSocket(socketConstraint.uri());

    websocket.onopen = function(evt) {
    	trace('Socket Open');
    	socket.obs['open'].fire();
    };

    websocket.onclose = function(evt) { 
    	trace('Socket Close');
    	socket.obs['close'].fire();
    };

    websocket.onmessage = function(evt) {
    	trace('Socket Message Receive ' + evt.data);
    	socket.obs['message'].fire(evt.data);
    };
    
    websocket.onerror = function(evt) {
    	trace('Socket Message Error ' + evt.data);
    	socket.obs['error'].fire(evt.data);
    };

	return socket;
}

LP.Socket.prototype = {
	/*
	 * addEventListener: document.addEventListener || document.attachEvent,
	 * dispatchEvent: document.dispatchEvent, fireEvent: document.fireEvent,
	 */

	on: function(ev, func) {
		this.obs[ev].subscribe(func);
	},

	stop: function() {
		this.websocket.close();
	},

	send: function(func, token, obj) {
		if (obj === undefined) {
			obj = {};
		}
		obj.func = func;
		obj.token = token;
		this.websocket.send(JSON.stringify(obj));		
	},
}
/*
 * Broadcast
 */

LP.Broadcast = function() {
	this.obs = [];
	this.running = true;
	this.socket			= null;
	this.localMediaStream	= null;
	this.nodes = [];
}

LP.Broadcast.init = function() {
	var broadcast = new LP.Broadcast();

	broadcast.obs['newpeer']	= new Observer();
	
	broadcast.getUserMedia();

	var socket = broadcast.socket = LP.Socket.init();
	socket.on('open', function() {

	});
	socket.on('message', function(message) {
		message = JSON.parse(message);
		switch(message.func) {
		case 'need_offer':
			var peer = broadcast.createPeer();

			peer.addStream(broadcast.localMediaStream);

			peer.on('createoffer', function(desc) {
				peer.setLocalDescription(desc);
				socket.send('offer', peer.token(), {sdp: peer.description()});
			});
			peer.createOffer();
			break;
		case 'answer':
			var peer = broadcast.nodes[message.token];
			if (LP.Peer.prototype.isPrototypeOf(peer)) {
				peer.setRemoteDescription(message.sdp);
			} 
			break;
		/*
		 * case 'icecandidates': var peer = broadcast.nodes[message.token]; if
		 * (LP.Peer.prototype.isPrototypeOf(peer)) { if
		 * (Array.isArray(message.ices)) { message.ices.forEach(function(ice) {
		 * peer.addRemoteIceCandidate(ice); }); } } break;
		 */
		case 'need_icecandidates':
			var peer = broadcast.nodes[message.token];
			if (LP.Peer.prototype.isPrototypeOf(peer)) {
				socket.send('icecandidates', peer.token(), { ices: peer.candidates() });
			}
		break;
		};
		return;
	});

	return broadcast;
}

LP.Broadcast.prototype = {
	on: function(ev, func) {
		this.obs[ev].subscribe(func);
	},

	isRunning: function() {
		return this.running;
	},
	
	stop: function() {
		this.socket.stop();
		this.nodes.forEach(function(node) {
			node.stop();
		});
		this.localMediaStream.stop();
		this.running = false;
	},

	createPeer: function() {
		var newPeer = LP.Peer.init();
		this.nodes[ newPeer.generateToken() ] = newPeer;
		this.obs['newpeer'].fire(newPeer);
		return newPeer;
	},

	getUserMedia: function() {
		trace('Get UserMedia');

		var broadcast = this;
		navigator.mediaDevices.getUserMedia(mediaConstraints)
		.then(function(lmStream) {
			trace('UserMedia received' + lmStream);
			broadcast.setLocalMediaStream(lmStream);
		}).catch(error);
	},
	
	setLocalMediaStream: function(lmStream) {
		this.localMediaStream = lmStream;
	},

	setOpusCodec: function() {
		
	},
}


/*
 * Player
 */

// Class for Radio and Player
// Distinct for parameter in constructor
LP.Player = function(obj, type) {
	this.obs	= [];
	this.running = true; 
	this.socket	= null;
	this.node	= null; 
}

LP.Player.init = function(obj, type) {
	var player	= new LP.Player();

	player.obs['newpeer']	= new Observer();
 
	var socket	= player.socket	= LP.Socket.init();
	socket.on('open', function() {
		socket.send('need_offer');
	});
	socket.on('message', function(message) {

		message = JSON.parse(message);
		switch(message.func) {
		case 'offer':
			if (player.node === null) {
				player.node	= LP.Peer.init(message.token);
				player.obs['newpeer'].fire(player.node);
				
				player.node.on('addstream', function(event) {
					player.onAddStreamCallback(event);
				});
				player.node.on('setremotedescription', function() {
					player.node.createAnswer();
				});
				player.node.on('createanswer', function(desc) {
					player.node.setLocalDescription(desc);
					socket.send('answer', player.node.token(),{ sdp: player.node.description() });
					socket.send('need_icecandidates', player.node.token());
				});
	
				player.node.setRemoteDescription(message.sdp);
			}
			break;
		case 'icecandidates':
			if (player.node.token() == message.token)
			{
				if (Array.isArray(message.ices))
				{
					message.ices.forEach(function(ice) {
						player.node.addRemoteIceCandidate(ice);
					});
					// socket.send('icecandidates', player.node.token(), { ices:
					// player.node.candidates() });
				}
			}
			break;
		};
		return;
	});

	return player;
}

LP.Player.prototype = {
	on: function(ev, func) {
		this.obs[ev].subscribe(func);
	},

	isRunning: function() {
		return this.running;
	},
	
	stop: function() {
		//this.socket	= null;
		//this.node	= null;
		this.running = false;
	},

	onAddStreamCallback: function(event) {
		trace('Stream added'+ event);
		this.sendSuccessCallback(event);
	},
	
	setOpusCodec: function() {
		
	},

	sendSuccessCallback: function(event) {
		// audio2.srcObject = e.stream;
		// phoneOutput = new AudioContext();

		// var aa = phoneOutput.createMediaStreamSource(event.stream);
		// aa.connect(phoneOutput.destination);
		var audio2 = document.querySelector('audio#audio2');
		  audio2.srcObject = event.stream;
		  
		  
	}
	
}

/*
 * Live Peer Interceptor
 */	

LP.Interceptor = function() {


}

LP.Interceptor.init = function(token) {
	trace('Starting Tracker');

	var tracker = new LP.Tracker();
	
	return tracker;
}

LP.Interceptor.prototype = {
		
}

/*
 * Live Peer Tracker
 */
LP.Tracker = function() {


}

LP.Tracker.init = function(token) {
	trace('Starting Tracker');

	var tracker = new LP.Tracker();
	
	return tracker;
}

LP.Tracker.prototype = {
		
}

})()

// Exemplos
//https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/webrtc-integration.html

// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
// https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
// https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/loop

//https://subvisual.co/blog/posts/39-tutorial-html-audio-capture-streaming-to-node-js-no-browser-extensions
//http://www.webrtc-experiment.com/RecordRTC.js
//https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createScriptProcessor

// https://www.webrtc-experiment.com/docs/how-to-switch-streams.html
// https://developer.mozilla.org/pt-BR/docs/Web/API/Navigator/getUserMedia
// http://www.html5rocks.com/en/tutorials/webrtc/basics/?redirect_from_locale=pt
// https://webrtc.github.io/samples/src/content/peerconnection/audio/
// https://github.com/webrtc/samples/blob/gh-pages/src/content/peerconnection/audio/js/main.js#L241

/*

			var audioCtx = new AudioContext();

            var source = audioCtx.createMediaStreamSource(lmStream);
			var scriptNode = audioCtx.createScriptProcessor(4096, 1, 1);
		    //var scriptNode = context.createJavaScriptNode();
		    //var scriptNode = context.createJavaScriptNode(2048, 2, 2);
	        var peer = audioCtx.createMediaStreamDestination();

			scriptNode.onaudioprocess = function(audioProcessingEvent) {
			  // The input buffer is the song we loaded earlier
			  var inputBuffer = audioProcessingEvent.inputBuffer;

			  // The output buffer contains the samples that will be modified and played
			  var outputBuffer = audioProcessingEvent.outputBuffer;

			  // Loop through the output channels (in this case there is only one)
			  for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
			    var inputData = inputBuffer.getChannelData(channel);
			    var outputData = outputBuffer.getChannelData(channel);

			    // Loop through the 4096 samples
			    for (var sample = 0; sample < inputBuffer.length; sample++) {
			      // make output equal to the same as the input
			      outputData[sample] = inputData[sample];

			      // add noise to each output sample
			      outputData[sample] += ((Math.random() * 2) - 1) * 0.2;         
			    }
			  }
			};

			source.connect(scriptNode);
			scriptNode.connect(peer);
			//source.connect(peer);

			broadcast.teste = peer;
			
			//scriptNode.connect(audioCtx.destination);

			//scriptNode.connect(audioCtx.destination);

			var audio2 = document.querySelector('audio#audio2');
			audio2.srcObject = peer.stream;

*/