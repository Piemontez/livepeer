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

LP.audioContext = new AudioContext();
LP.isTrace = true;

var socketConstraint = {
	'securite'	: 'ws',
	'host'		: 'livepeer.local',
	'port'		: '8081',
	'key'		: 'ws',
	uri: function() {
		return this.securite + '://' + this.host + ':' + this.port + '/' + this.key;
	}
}

var dfServers = {
	"iceServers": [
		{"url": "stun:stun.l.google.com:19302"}
	]
};
var dfPeerConstraints = {
	'optional': [{RtpDataChannels: true}]
};

var dfDataChannelOptions = {
	ordered: false, // do not guarantee order
	maxRetransmitTime: 3000, // in milliseconds
}

var dfOfferOptions = {
	offerToReceiveAudio: 0,
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
	if (LP.isTrace) {
		if (msg === undefined) {
			console.log(obj);
		}
	}
}
/*
 * Observer
 */

//constructor class
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

//constructor class
LP.Peer = function() {
	this.obs = [];

	this.token = null;

	this.mediaStream = null;
	this.mediaStreamSource = null;//InputReader
	this.streamDestination = null;// OutputReader

	this.description= null;
	this.candidates	= [];
	this.connection	= null;
	this.dataChannel = null;
}

//static function
LP.Peer.init = function(token, servers, constraints) {
	trace('Starting Peer');

	var peer = new LP.Peer();
	if (token !== undefined) { 
		peer.token = token;
	}

	if (servers === undefined) {
		servers = dfServers;
	}

	if (constraints === undefined) {
		constraints = dfPeerConstraints;
	}

	peer.obs['open']			= new Observer();
	peer.obs['message']			= new Observer();
	peer.obs['addstream']		= new Observer();
	peer.obs['createoffer']		= new Observer();
	peer.obs['createanswer']	= new Observer();
	peer.obs['icecandidate']	= new Observer();
	peer.obs['setremotedescription'] = new Observer();
	
	peer.on('icecandidate', function(event) {
		peer.onicecandidate(event);
	});
	
	peer.connection = new RTCPeerConnection(servers, constraints);
	peer.connection.onicecandidate = function(event) {
		trace('On Ice Candidate');
		peer.obs['icecandidate'].fire(event);
	};
	peer.connection.onaddstream = function(event) {
		trace('On Add Stream');

		peer.setMediaStream(event.stream);
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
		this.candidates.push(event.candidate);
	},
	
	setMediaStream: function(lmStream) {
		this.mediaStream = lmStream;
		this.mediaStreamSource = LP.audioContext.createMediaStreamSource(lmStream);
	},

	createStreamDestination: function() {
		return this.streamDestination = LP.audioContext.createMediaStreamDestination();
	},

	addStream: function(streamDest) {
		this.connection.addStream(streamDest.stream);
	},
	
	createDataChannel: function(opts) {
		if (opts === undefined) {
			opts = dfDataChannelOptions;
		}
		var peer = this;
		this.dataChannel = this.connection.createDataChannel("myLabel", opts);

		this.dataChannel.onerror = function (error) {
			error("Data Channel Error:", error);
		};

		this.dataChannel.onmessage = function (event) {
			trace("Got Data Channel Message.");
			peer.obs['message'].fire(event.data);
		};

		this.dataChannel.onopen = function () {
			trace("Data channel open");
			peer.obs['open'].fire();
		};

		this.dataChannel.onclose = function () {
			trace("The Data Channel is Closed");
		};
	},
	
	send: function(message) {
		this.dataChannel.send(message);
	},

	createOffer: function() {
		var peer = this;
		this.connection.createOffer(function(desc) {
			trace('Offer created for peer connection\n' + desc.sdp);
			peer.obs['createoffer'].fire(desc)

		},error,  dfOfferOptions);
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
		this.description = desc;
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

	addRemoteIceCandidate: function(candidate) {
		if (candidate !== null)
		this.connection.addIceCandidate(new RTCIceCandidate(candidate),
			function() {
				trace('ICE candidate added');
			}, 
			function () {
				trace('ICE candidate not added');
		});
	},

	generateToken: function() {
		return this.token = Math.random();
	}
}

/*
 * Socket
 */
//constructor class
LP.Socket = function() {
	this.obs = [];
	this.websocket = null;
}

//static function
LP.Socket.init = function() {
	trace('Starting Socket');

	var socket = new LP.Socket();
	socket.offAll('open');
	socket.offAll('close');
	socket.offAll('message');
	socket.offAll('error');
    
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
	on: function(ev, func) {
		this.obs[ev].subscribe(func);
	},

	offAll: function(ev) {
		this.obs[ev] = new Observer();
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
//constructor class
LP.Broadcast = function() {
	this.obs = [];
	this.running = true;
	this.socket			= null;
	this.localMediaStream	= null;
	this.mediaStreamSource	= null;// InputReader
	this.nodes = [];
}

//static function
LP.Broadcast.init = function() {
	var broadcast = new LP.Broadcast();
	broadcast.boot();
	return broadcast;
}

LP.Broadcast.prototype = {
	boot: function() {

		var broadcast = this;

		broadcast.obs['newpeer']	= new Observer();
		
		// broadcast.createScriptProcessor();

		var socket = broadcast.socket = LP.Socket.init();
		socket.on('open', function() {
			broadcast.getUserMedia();
		});
		socket.on('message', function(message) {
			message = JSON.parse(message);
			switch(message.func) {
			case 'need_offer':
				var peer = broadcast.createPeer();

				peer.addStream( peer.streamDestination );

				peer.on('createoffer', function(desc) {
					peer.setLocalDescription( desc );

					socket.send('offer', peer.token, {sdp: peer.description});
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
					socket.send('icecandidates', peer.token, { ices: peer.candidates });
				}
			break;
			};
			return;
		});		
	},

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
		newPeer.createStreamDestination();
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
			broadcast.createScriptProcessor();

		}).catch(error);
	},
	
	setLocalMediaStream: function(lmStream) {
		this.localMediaStream = lmStream;
		this.mediaStreamSource = LP.audioContext.createMediaStreamSource(lmStream);
	},

	sampleRate: function() {
		return this.mediaStreamSource.context.sampleRate;
	},

	createScriptProcessor: function() {
		var processor = LP.audioContext.createScriptProcessor(4096, 1, 1);
		processor.connect(LP.audioContext.createMediaStreamDestination());
		
		this.mediaStreamSource.connect(processor);
		
		var broadcast = this;
		processor.onaudioprocess = function(audioProcessingEvent) {
			broadcast.receiveSuccessCallback(
					audioProcessingEvent.inputBuffer,
					audioProcessingEvent.outputBuffer)
		}
	},
	
	setOpusCodec: function() {
		
	},
	
	receiveSuccessCallback: function(inputBuffer, outputBuffer) 
	{
		for (var key in this.nodes) 
		{
			var node = this.nodes[key];

			var source = LP.audioContext.createBufferSource();
			source.buffer = outputBuffer; // = LP.audioContext.createBuffer(1,
											// 4096, broadcast.sampleRate());
			source.connect( node.streamDestination );
				
			for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
				var inputData = inputBuffer.getChannelData(channel);
				var outputData = outputBuffer.getChannelData(channel);
			
				for (var sample = 0; sample < outputData.length; sample++) {
			      	outputData[sample] = inputData[sample];
			      	outputData[sample] = Math.random() * 2;
				}
			}
			source.start();
		}
	}
}

/*
 * Player
 */

//constructor class
LP.Player = function() {
	this.obs	= [];
	this.running = true; 
	this.socket	= null;
	this.node	= null; 
	this.streamDestination = null;
}

//static function
LP.Player.init = function() {
	var player = new LP.Player();
	player.boot();
	return player;
}

LP.Player.prototype = {
	boot: function() {

		var player = this;

		player.createStreamDestination();

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
						socket.send('answer', player.node.token,{ sdp: player.node.description });
						setTimeout(function() {// TODO adicionar de forma progressiva também
							socket.send('need_icecandidates', player.node.token);
						}, 800);
					});
		
					player.node.setRemoteDescription(message.sdp);
				}
				break;
			case 'icecandidates':
				if (player.node.token == message.token)
				{
					if (Array.isArray(message.ices))
					{
						message.ices.forEach(function(ice) {
							player.node.addRemoteIceCandidate(ice);
						});
						//socket.send('icecandidates', player.node.token, { ices: player.node.candidates() });
					}
				}
				break;
			};
			return;
		});		
	},

	on: function(ev, func) {
		this.obs[ev].subscribe(func);
	},

	isRunning: function() {
		return this.running;
	},
	
	stop: function() {
		// this.socket = null;
		// this.node = null;
		this.running = false;
	},

	createStreamDestination: function() {
		return this.streamDestination = LP.audioContext.createMediaStreamDestination();
	},

	onAddStreamCallback: function(event) {
		trace('Stream added'+ event);

		var audio2 = document.querySelector('audio#audio2');
		//audio2.srcObject = event.stream;
		//audio2.srcObject = this.streamDestination;
		//audio2.srcObject = this.node.mediaStream;

		//this.node.mediaStreamSource.connect(this.streamDestination);
		var processor = LP.audioContext.createScriptProcessor(4096, 1, 1);
		this.node.mediaStreamSource.connect(processor);
		//processor.connect(LP.audioContext.destination);
		//processor.connect(this.streamDestination);
		
		var player = this;
		processor.onaudioprocess = function(audioProcessingEvent) {
			player.sendSuccessCallback(
				audioProcessingEvent.inputBuffer,
				audioProcessingEvent.outputBuffer);
		}

	},
	
	setOpusCodec: function() {
		
	},

	sendSuccessCallback: function(inputBuffer, outputBuffer) {

		var source = LP.audioContext.createBufferSource();
		source.buffer = outputBuffer;
		source.connect( LP.audioContext.destination );

		for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
			var inputData = inputBuffer.getChannelData(channel);
			var outputData = outputBuffer.getChannelData(channel);
		
			for (var sample = 0; sample < outputData.length; sample++) {
		      	outputData[sample] = inputData[sample];
			}
		}

		source.start();
	}
}

/*
 * Live Peer Interceptor
 */	

//constructor class
LP.Interceptor = function() {
	this.obs = [];
	this.tracker = null;
	this.socket	= null;
}

//static function
LP.Interceptor.init = function(obj) {
	trace('Starting Interceptor');

	var interceptor = new LP.Interceptor();
	interceptor.intercepet(obj);
	return interceptor;
}

LP.Interceptor.prototype = {
	on: function(ev, func) {
		this.obs[ev].subscribe(func);
	},
	
	intercepet: function(obj) {
		var interceptor = this;

		interceptor.createTrackerPeer();
		
		obj.socket.offAll('open');
		obj.socket.offAll('message');
		
		obj.socket.on('open', function(e) {
			obj.socket.send('init_connection', interceptor.tracker.token);
		});
		
		obj.socket.on('message', function(message) {
			message = JSON.parse(message);
			switch(message.func) {
			case 'tracker_sdp':
				//if (player.node === null) { check token
					interceptor.tracker.token = message.token;
					//interceptor.tracker.obs['tracker'].fire(interceptor.tracker);
					
					interceptor.tracker.on('setremotedescription', function() {
						interceptor.tracker.createAnswer();
					});
					interceptor.tracker.on('createanswer', function(desc) {
						interceptor.tracker.setLocalDescription(desc);
						obj.socket.send('answer', interceptor.tracker.token,{ sdp: interceptor.tracker.description });
						setTimeout(function() {// TODO adicionar de forma progressiva também
							obj.socket.send('need_icecandidates', interceptor.tracker.token);
						}, 800);
					});
		
					interceptor.tracker.setRemoteDescription(message.sdp);
				//}
				break;
			case 'icecandidates':
				if (interceptor.tracker.token == message.token)
				{
					if (Array.isArray(message.ices))
					{
						message.ices.forEach(function(ice) {
							interceptor.tracker.addRemoteIceCandidate(ice);
						});
						obj.socket.send('icecandidates', interceptor.tracker.token, { ices: interceptor.tracker.candidates });
					}
				}
				break;
			};
		});
		
		obj.receiveSuccessCallback = this.receiveSuccessCallback; 
		obj.sendSuccessCallback = this.sendSuccessCallback; 
	},
	
	createTrackerPeer: function()  {
		
		var tracker = this.tracker = LP.Peer.init(null, dfServers, null);
		tracker.createDataChannel();
		
		tracker.on('open', function() {
			tracker.send('interceptor messaga');
		});
		tracker.on('message', function(message) {
			console.log(message);
		});

	},
	
	receiveSuccessCallback: function(inputBuffer, outputBuffer) {
		console.log(1);
	},
	
	sendSuccessCallback: function(inputBuffer, outputBuffer) {
		console.log(2);
	},
}

/**
 * Init class Broadcast/Player intercepted
 */

//constructor class
LP.BroadcastIntercepted = function() {
	LP.Broadcast.call(this);
}
//subclass extends superclass
LP.BroadcastIntercepted.prototype = Object.create(LP.Broadcast.prototype);
LP.BroadcastIntercepted.prototype.constructor = LP.Broadcast;

//static function
LP.BroadcastIntercepted.init = function() {
	trace('Broadcat with interceptor');
	var broadcast = new LP.BroadcastIntercepted();
	broadcast.boot();
	LP.Interceptor.init(broadcast);	
	return broadcast;
}

//constructor class
LP.PlayerIntercepted = function() {
	LP.Player.call(this);
} 
//subclass extends superclass
LP.PlayerIntercepted.prototype = Object.create(LP.Player.prototype);
LP.PlayerIntercepted.prototype.constructor = LP.Player;

//static function
LP.PlayerIntercepted.init = function() {
	trace('Player with interceptor'); 
	var player = new LP.PlayerIntercepted();
	LP.Interceptor.init(player);	
	player.boot();
	return player ;
}

/*
 * Live Peer Tracker
 */
LP.Tracker = function() {
	this.obs = [];
	this.nodes = [];
	this.socket	= null;
}

LP.Tracker.init = function(token) {
	trace('Starting Tracker');

	var tracker = new LP.Tracker();
	tracker.boot();

	return tracker;
}

LP.Tracker.prototype = {
	boot: function() {

		var tracker = this;
		
		tracker.obs['newpeer']	= new Observer();
		
		var socket = tracker.socket = LP.Socket.init();
		socket.on('open', function() {
			//socket.send('register_tracker', socket.id());
		});
		socket.on('message', function(message) {
			message = JSON.parse(message);
			switch(message.func) {
			case 'init_connection':
				var peer = tracker.createPeer();

				peer.on('createoffer', function(desc) {
					peer.setLocalDescription( desc );

					socket.send('tracker_sdp', peer.token, {sdp: peer.description});
				});

				peer.createOffer();
				break;
			case 'answer':
				var peer = tracker.nodes[message.token];
				if (LP.Peer.prototype.isPrototypeOf(peer)) {
					peer.setRemoteDescription(message.sdp);
				} 
				break;
			
			case 'icecandidates':
				var peer = tracker.nodes[message.token];
				if (LP.Peer.prototype.isPrototypeOf(peer)) { 
					if (Array.isArray(message.ices)) { 
						message.ices.forEach(function(ice) {
							peer.addRemoteIceCandidate(ice); }
						); 
					} 
				} 
			 	break;
			case 'need_icecandidates':
				var peer = tracker.nodes[message.token];
				if (LP.Peer.prototype.isPrototypeOf(peer)) {
					socket.send('icecandidates', peer.token, { ices: peer.candidates });
					socket.send('need_icecandidates', peer.token, { ices: peer.candidates });
				}
				break;
			};
			return;
		});
	},

	createPeer: function() {
		var newPeer = LP.Peer.init(null, dfServers, null);

		newPeer.createDataChannel();
		newPeer.createStreamDestination();

		newPeer.on('open', function() {
			newPeer.send('tracker messaga');
		});
		newPeer.on('message', function(message) {
			console.log(message);
		});

		
		this.nodes[ newPeer.generateToken() ] = newPeer;
		this.obs['newpeer'].fire(newPeer);
		return newPeer;
	},

	stop: function() {

	},

	on: function(ev, func) {
		this.obs[ev].subscribe(func);
	},
}
})()

// Exemplos
// https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/webrtc-integration.html

// https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
// https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
// https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/loop

// https://subvisual.co/blog/posts/39-tutorial-html-audio-capture-streaming-to-node-js-no-browser-extensions
// http://www.webrtc-experiment.com/RecordRTC.js
// https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/createScriptProcessor

// https://www.webrtc-experiment.com/docs/how-to-switch-streams.html
// https://developer.mozilla.org/pt-BR/docs/Web/API/Navigator/getUserMedia
// http://www.html5rocks.com/en/tutorials/webrtc/basics/?redirect_from_locale=pt
// https://webrtc.github.io/samples/src/content/peerconnection/audio/
// https://github.com/webrtc/samples/blob/gh-pages/src/content/peerconnection/audio/js/main.js#L241
