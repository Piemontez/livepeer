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
LP.isTrace = false;
LP.blockCount = 5; // 5 = [1,1,1,1,1]
LP.blockSize = 31; // (base 2) = 11111 
//LP.streamSize = 1024;
LP.streamSize = 4096;
LP.blockDelay = 5;

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
var dfPeerConstraints = null; off = {
	'optional': [{RtpDataChannels: true}]
};

var dfDataChannelOptions = {
	reliable: false,
	ordered: false, // do not guarantee order
	maxRetransmitTime: 1000, // in milliseconds
}

var dfOfferOptions = null; off = {
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
function trace(obj) {
	if (LP.isTrace) {
		console.log(obj.substring(0, 120));
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
		//if (auto)
    	socket.autoConnect(evt.data);
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
	
	findPeer: function(peer) {
		throw "override getPeer function required";
	},
	
	autoConnect: function(message) {
		message = JSON.parse(message);
		switch(message.func) {
		/*case 'init_connection':
			var peer = this.findPeer(message.to);
			if (LP.Peer.prototype.isPrototypeOf(peer)) {
				var newPeer = interceptor.createPeer(true);
				newPeer.on('createoffer', function(desc) {
					newPeer.setLocalDescription( desc );
					this.send('sender_sdp', newPeer.token, { to: message.token, sdp: newPeer.description});
				});
				newPeer.createOffer();
			}
			break;*/
		case 'sender_sdp':
			var peer = this.findPeer(message.to);
			if (LP.Peer.prototype.isPrototypeOf(peer)) {
				var socket = this;
				peer.on('setremotedescription', function() {
					peer.createAnswer();
				});
				peer.on('createanswer', function(desc) {
					peer.setLocalDescription(desc);
					socket.send('answer', peer.token, { to: message.token, sdp: peer.description });
					setTimeout(function() {// TODO adicionar de forma progressiva também
						socket.send('need_icecandidates', peer.token, { to: message.token });
					}, 800);
				});
				peer.setRemoteDescription(message.sdp);
			}
			break;
		case 'answer':
			var peer = this.findPeer(message.to);
			if (LP.Peer.prototype.isPrototypeOf(peer)) {
				peer.setRemoteDescription(message.sdp);
			} 
			break;
		case 'need_icecandidates':
			var peer = this.findPeer(message.to);
			if (LP.Peer.prototype.isPrototypeOf(peer)) {
				this.send('icecandidates', peer.token, { to: message.token, ices: peer.candidates });
				if (message.answer === undefined) {
					this.send('need_icecandidates', peer.token, { to: message.token, ices: peer.candidates, answer: true });
				}
			} 
		 	break
		case 'icecandidates':
			var peer = this.findPeer(message.to);
			if (LP.Peer.prototype.isPrototypeOf(peer)) { 
				if (Array.isArray(message.ices)) { 
					message.ices.forEach(function(ice) {
						peer.addRemoteIceCandidate(ice); }
					); 
				} 
			} 
		 	break;;
		}
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
 * Peer
 */

//constructor class
LP.Peer = function() {
	//for_ttc
	this.bytesSent = 0
	//for_ttc
	
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
	peer.obs['createdatachannel']		= new Observer();
	peer.obs['setremotedescription'] 	= new Observer();
	
	peer.on('icecandidate', function(event) {
		peer.onicecandidate(event);
	});
	
	peer.connection = new RTCPeerConnection(servers, constraints);
	
	peer.connection.ondatachannel = function(event) {
		peer.createDataChannel(null, event.channel);
	};
	peer.connection.oniceconnectionstatechange = function(event) {
		trace('ICE connection state change:' + event.target.iceConnectionState)
	};
	peer.connection.onicecandidate = function(event) {
		trace('On Ice Candidate');
		peer.obs['icecandidate'].fire(event);
	};
	peer.connection.onaddstream = function(event) {
		trace('On Add Stream');

//		peer.setMediaStream(event.stream);
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
	
	createDataChannel: function(opts, dataChannel) {
		if (opts === undefined) {
			opts = dfDataChannelOptions;
		}
		var peer = this;
		if (dataChannel === undefined) {
			peer.dataChannel = this.connection.createDataChannel("myLabel" + Math.random(), opts);
		} else {
			peer.dataChannel = dataChannel;
		}

		peer.dataChannel.onerror = function (error) {
			error("Data Channel Error:", error);
		};

		peer.dataChannel.onmessage = function (event) {
			if(event.data instanceof ArrayBuffer 
				|| event.data instanceof Object) {
				peer.obs['message'].fire(new Float32Array(event.data));
			} else {
				trace("Got Data Channel Message:" + event.data);
				peer.obs['message'].fire(event.data);
			}
		};

		peer.dataChannel.onopen = function () {
			trace("Data channel open");
			peer.obs['open'].fire();
		};

		peer.dataChannel.onclose = function () {
			trace("The Data Channel is Closed");
		};

		peer.obs['createdatachannel'].fire(0);
	},
	
	readyState: function() {
		if (this.dataChannel !== null) {
			return this.dataChannel.readyState;
		}
		return undefined;
	},
	
	isOpen: function() {
		return this.readyState() == "open"
	},
	
	send: function(func, obj) {
		if (obj === undefined) {
			obj = {};
		}
		obj.func = func;
		
		if (obj.func == 'onlydata') {
			this.dataChannel.send(obj.data);
			//for_ttc
			this.bytesSent += obj.data.length;
			//for_ttc
		} else 
			this.dataChannel.send(JSON.stringify(obj));
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
 * Broadcast
 */
//constructor class
LP.Broadcast = function() {
	this.type = ['sender'];
	this.obs = [];
	this.running = true;
	this.streamPos = 0;
	this.socket				= null;
	this.localMediaStream	= null;
	this.mediaStreamSource	= null;// InputReader
	this.mediaScriptProcessor = null;
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

		broadcast.getUserMedia();

		broadcast.obs['newpeer']	= new Observer();
		
		var socket = broadcast.socket = LP.Socket.init();
		socket.on('open', function() {
		});
		
		socket.findPeer = function(token) {
			var peer = broadcast.nodes[token];
			if (peer != undefined)
				return interceptor.nodes[token];
		};

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
		this.obs['newpeer'].fire(newPeer);

		newPeer.createStreamDestination();
		this.nodes[ newPeer.generateToken() ] = newPeer;

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
		this.mediaScriptProcessos = LP.audioContext.createScriptProcessor(LP.streamSize, 1, 1);
		this.mediaScriptProcessos.connect(LP.audioContext.createMediaStreamDestination());
		
		this.mediaStreamSource.connect(this.mediaScriptProcessos);
		
		var broadcast = this;
		this.mediaScriptProcessos.onaudioprocess = function(audioProcessingEvent) {
			audioProcessingEvent.inputBuffer.streamPos = broadcast.streamPos++;

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
											// LP.streamSize, broadcast.sampleRate());
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
	this.type = ['receiver'];
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
		socket.findPeer = function(token) {
			console.log("-----------");
			console.log(player.node.token);
			console.log(token);
			if (player.node.token == token)
				return player.node;
		};
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
		audio2.srcObject = event.stream;
		audio2.srcObject = this.streamDestination;
		audio2.srcObject = this.node.mediaStream;
//TODO:FAZER FUNCIONAR NAS DOIS MODOS DE SISTEMA
/*
		//this.node.mediaStreamSource.connect(this.streamDestination);
		var processor = LP.audioContext.createScriptProcessor(LP.streamSize, 1, 1); 
		this.node.mediaStreamSource.connect(processor);

		//processor.connect(LP.audioContext.destination);
		//processor.connect(this.streamDestination);
		
		var player = this;
		processor.onaudioprocess = function(audioProcessingEvent) {
			player.sendSuccessCallback(
				audioProcessingEvent.inputBuffer,
				audioProcessingEvent.outputBuffer);
		}
*/
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
	//this.socket	= null;
	this.intercepted = null;
	this.nodes = [];
	this.sender = []; //matrix
	this.receiving = 0; //max = 31 = x11111
	this.buffer = new Array();
	this.lastStreamLoad = 0;
}

//static function
LP.Interceptor.init = function(obj) {
	trace('Starting Interceptor');

	var interceptor = new LP.Interceptor();

	interceptor.intercepet(obj);
	return interceptor;
}
var test = 0
LP.Interceptor.prototype = {
	on: function(ev, func) {
		this.obs[ev].subscribe(func);
	},
	
	intercepet: function(obj) {
		var interceptor = this;

		interceptor.intercepted = obj;

		interceptor.createTrackerPeer();
		interceptor.createManager();
		
		obj.socket.offAll('open');
		obj.socket.offAll('message');
		
		obj.socket.findPeer = function(token) {
			var peer = interceptor.nodes[token];
			if (peer != undefined)
				return interceptor.nodes[token];
			else if (interceptor.tracker.token == token)
				return interceptor.tracker;
				
		};
		obj.socket.on('open', function(e) {
			obj.socket.send('tracker_connection', interceptor.tracker.token);
		});
		
		obj.socket.on('message', function(message) {
			message = JSON.parse(message);
			switch(message.func) {
			case 'init_connection':
				var peer = obj.socket.findPeer(message.to);
				if (LP.Peer.prototype.isPrototypeOf(peer)) {
					var newPeer = interceptor.createPeer(true);
					newPeer.on('createoffer', function(desc) {
						newPeer.setLocalDescription( desc );
						obj.socket.send('sender_sdp', newPeer.token, { to: message.token, sdp: newPeer.description});
					});
					newPeer.createOffer();
				}
				break;
			};
		});
		
		obj.receiveSuccessCallback = function (i, o) {
			interceptor.receiveSuccessCallback(i, o);
		};
		obj.sendSuccessCallback = function (i, o) {
			interceptor.sendSuccessCallback(i, o); 
		};
		
		this.sendSP = LP.audioContext.createScriptProcessor(LP.streamSize, 1, 1);
		this.sendSP.connect(LP.audioContext.destination);

		//var source = LP.audioContext.createBufferSource();
		//source.loop = true;
		//source.loopStart = 0;
		//source.loopEnd = 10000000;
		//source.buffer = LP.audioContext.createBuffer(1, LP.streamSize, LP.audioContext.sampleRate);
		//source.connect(processor);
		//source.start();

		this.sendSP.onaudioprocess = function(audioProcessingEvent) {
			interceptor.sendSuccessCallback(
				audioProcessingEvent.inputBuffer,
				audioProcessingEvent.outputBuffer);
		}

	},

	createPeer: function(answer) {
		var interceptor = this;
		var newPeer = LP.Peer.init();
		this.intercepted.obs['newpeer'].fire(newPeer);

		//TODO: Verificar necessidade de criar um datachannel de cada lado do peer.
		if (answer) {
			newPeer.createDataChannel();
		}

		newPeer.on('message', function(message) {
			if (message instanceof Float32Array) {
				var streamPos = message[0];
				var data = message.subarray(1, LP.streamSize);

				interceptor.buffer.push({ streamPos: streamPos, data: data });
				interceptor.receiveSuccessCallback({ streamPos: streamPos, data: data });
				return;
			}
			
			message = JSON.parse(message);
			switch(message.func) {
			case 'stream':
				interceptor.buffer.push(message);
				interceptor.receiveSuccessCallback(message, null);
				break;
			case 'give_to_me_offer':
				interceptor.addSender(message.blocks, newPeer);
				break;
			case 'have_this_offer':
				newPeer.blocks = message.blocks;
				break;
			case 'need_offer_for':
				newPeer.send('have_this_offer', {blocks: interceptor.haveThisBlocks(message.blocks)});
				break;
			case 'iam':
				newPeer.types = message.types;
				break;
			case 'whoareyou':
				newPeer.send('iam', {types: interceptor.intercepted.type});
				break;
			}
		});

		newPeer.on('open', function() {
			
		});

		this.nodes[ newPeer.generateToken() ] = newPeer;
		return newPeer;
	},

	createManager: function() {
		var interceptor = this;
		setTimeout(function(){ interceptor.run(); }, 3000);
	},

	run: function() {
		for (var key in this.nodes) 
		{
			try {
				var node = this.nodes[key];
				if (node == null || !node.isOpen()) {
					//TODO:Verificar por e remover da lista se necessário
					continue;
				}
				//Identificar o tipo de nõ na outra ponte
				if (node.types === undefined) {
					node.send('whoareyou');
					continue;
				}
				//Coletar quais blocos a outra ponta possui
				if (node.blocks === undefined) {
					//Verifica se este nó é um receptor de stream e se o outro peer é um doador
					if (this.intercepted.type.indexOf('receiver') > -1
							&& node.types.indexOf('sender') > -1) {
						node.send('need_offer_for', {blocks: this.needThisBlocks()});
					}
					continue;
				}
				//Coletar quais blocos a outra ponta possui
				if (node.getting === undefined) {
					node.getting = true;
					node.send('give_to_me_offer', {blocks: this.sendToMeThisBlocks(node)});
				}
			} catch(err) {
				error(err.message);
			}
		}
		var interceptor = this;
		setTimeout(function(){ interceptor.run(); }, 800);
	},
	
	//determina qual bloco cada sender deve enviar
	managerBlock: function() {
		var blocks = 0;
		var receivers = [];
		//Identifica os blocos novos e que conseguem enviar.
		for (var key in this.nodes) {
			var sender = this.nodes[key];
			if (sender.blocks !== undefined && sender.blockSender === undefined) {
				receivers.push(sender);
				sender.blockSender = 0;
				blocks =  blocks | (this.needThisBlocks() & sender.blocks);
			}
		}
		//determina qual bloco cada sender deve enviar		
		var last = 0;
		for(var shiftPos = 1; shiftPos < LP.blockSize; shiftPos *= 2)
		{
			if (shiftPos & blocks) {
				var sender = receivers[last];
				if (shiftPos & sender.blocks) {
					this.receiving = this.receiving | shiftPos;
					sender.blockSender = sender.blockSender | shiftPos;
					last++;
					if (last >= receivers.length) {
						last = 0
					}
				}
			}
		}
	},
	
	/*
	 * Receiver informa quais blocos nescessita receber
	 */
	needThisBlocks: function() {
		//Ex: 111111 & ~(111001) = 111111 & 111...000110 = 000110  
		return LP.blockSize & (~this.receiving)
	},
	
	/*
	 * Sender, verifica se possui os stream solicitados
	 */
	haveThisBlocks: function(blocks) {
		return this.receiving & blocks;
	},
	
	/*
	 * Receive, informa quais blocos devem ser encaminhados
	 */
	sendToMeThisBlocks: function(node) {
		//Verifica se já é responsável por algum bloco
		if (node.blockSender !== undefined) {
			return node.blockSender;
		}
		this.managerBlock();
		
		return node.blockSender;
	},

	
	addSender: function(blocks, peer) {
		peer.sendBlocks = blocks;
		var realPos = 0;
		for(var shiftPos = 1; shiftPos < LP.blockSize; shiftPos *= 2)
		{
			if (shiftPos & blocks) {
				if (this.sender[realPos] === undefined) {
					this.sender[realPos] = [];
				}
				if (this.sender[realPos].indexOf(peer) == -1) {
					this.sender[realPos].push(peer);
				}
			}
			realPos++;
		}
	},
	
	createTrackerPeer: function()  {
		var interceptor = this;

		var tracker = this.tracker = LP.Peer.init(null, dfServers, null);

		tracker.generateToken();
		tracker.on('open', function() {
			
		});
		tracker.on('message', function(message) {
			message = JSON.parse(message);
			switch(message.func) {
			case 'whoareyou':
				tracker.send('iam', {token: tracker.token, types: interceptor.intercepted.type});
				setTimeout(function() {
					if (interceptor.intercepted.type.indexOf('receiver') > -1) {
						tracker.send('need_offer', {token: tracker.token});
					}
				}, 30);
				break;
			case 'check_offers':
				//TODO: trocar comunicação do webservice para com o tracker.
				for(key in message.tokens) 
				{
					var token = message.tokens[key];
					if (token !== tracker.token) {//Não iniciar comunicação comigo mesmo.
						var peer = interceptor.createPeer(false);
						interceptor.intercepted.socket.send('init_connection', peer.token, { to: token });
					}
				}
			}
		});

	},
	
	receiveSuccessCallback: function(inputBuffer, outputBuffer) {
		var inputData = null;
		if (outputBuffer == null
				&& inputBuffer.data !== undefined) {
			inputData = inputBuffer.data;
		}
		try {
			for (var channel = 0; channel < inputBuffer.numberOfChannels; channel++) {
				inputData = inputBuffer.getChannelData(channel);
				
				//Criar som chiado
				for (var pos = 0; pos < inputData.length; pos++) {
					inputData[pos] = Math.random();
				}
			}
			
			var streamBlockPos = inputBuffer.streamPos % Math.log2(LP.blockSize+1);
			for (var blockPos in this.sender) 
			{
				if (blockPos == streamBlockPos) {
					var peers = this.sender[blockPos];
					for (var key in peers)
					{
						var node = peers[key];
						if (node.isOpen()) {
							//TODO: Melhorar mecanismo de mensagem sem a utilização do json 
							var data = new Float32Array(new ArrayBuffer((LP.streamSize * 4) + 4));
							data.set([inputBuffer.streamPos], 0);
							data.set(inputData, 1);

							node.send('onlydata', { data: data });

							/*node.send('stream', {
								streamPos: inputBuffer.streamPos,
								data: inputData
							});*/
						}
					}
				}
			}
		} catch(ex) {
			error(ex);
		}
	},

	sendSuccessCallback: function(inputBuffer, outputBuffer) {
		var buffer = null;
		//TODO:Criar método get buffer
		for (key in this.buffer) {
			var input = this.buffer[key];
			if (this.lastStreamLoad == 0) {
				LP.
				this.lastStreamLoad = input.streamPos - LP.blockDelay; //Aproximadamente 3 segundos
				break;
			}
			if (this.lastStreamLoad == input.streamPos) {
				buffer = input.data;
			}
		}
		if (buffer != null) {
			var outputData = null;
			for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
				var outputData = outputBuffer.getChannelData(channel);
			
				for (var pos = 0; pos < outputData.length; pos++) {
			      	outputData[pos] = buffer[pos];
				}
			}
			//Enviar para speaker
			if (outputData != null) {
				var source = LP.audioContext.createBufferSource();
				source.buffer = outputBuffer;
				source.connect( LP.audioContext.destination );
				source.start();				
			}
		}
		this.lastStreamLoad++;
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
	var interceptor = LP.Interceptor.init(broadcast);
	interceptor.receiving = LP.blockSize;
	return broadcast;
}

//constructor class
LP.PlayerIntercepted = function() {
	LP.Player.call(this);
	this.type = ['sender', 'receiver'];
	//this.type = ['receiver'];
} 
//subclass extends superclass
LP.PlayerIntercepted.prototype = Object.create(LP.Player.prototype);
LP.PlayerIntercepted.prototype.constructor = LP.Player;

//static function
LP.PlayerIntercepted.init = function() {
	trace('Player with interceptor'); 
	var player = new LP.PlayerIntercepted();
	player.boot();
	LP.Interceptor.init(player);	
	return player ;
}

/*
 * Live Peer Tracker
 */
LP.Tracker = function() {
	this.obs = [];
	this.nodes = [];
	this.nodesOrdered = [];
	this.lastNodeCheck = 0;
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

		socket.findPeer = function(token) {
			return tracker.nodes[token];
		};
		socket.on('open', function() {
			//socket.send('register_tracker', socket.id());
		});
		socket.on('message', function(message) {
			message = JSON.parse(message);
			switch(message.func) {
			case 'tracker_connection':
				var peer = tracker.createPeer();
				peer.on('createoffer', function(desc) {
					peer.setLocalDescription( desc );
					socket.send('sender_sdp', peer.token, { to: message.token, sdp: peer.description});
				});

				peer.createOffer();
				break;
			};
			return;
		});
	},

	createPeer: function() {
		var tracker = this;
		var newPeer = LP.Peer.init(null, dfServers, null);
		this.obs['newpeer'].fire(newPeer);

		newPeer.createDataChannel();

		newPeer.on('open', function() {
			newPeer.send('whoareyou');
		});
		newPeer.on('message', function(message) {
			message = JSON.parse(message);
			switch(message.func) {
			case 'iam':
				newPeer.senderToken = message.token; 
				newPeer.types = message.types;
				break;
			case 'need_offer':
				var tokens = [];
				if (tracker.nodesOrdered.length < 6) {
					tokens.push(tracker.nodesOrdered[0].senderToken);
				} else {
					var lastCheck = tracker.lastNodeCheck;
					do
					{
						lastCheck++;
						if (lastCheck >= tracker.nodesOrdered.length) {
							lastCheck = 0;
						}
						var node = tracker.nodesOrdered[lastCheck];
	
						if (node.types.indexOf('sender') > -1
								&& message.token != node.senderToken) {
							tokens.push(node.senderToken);
						}
					} while (tokens.length < LP.blockCount && tracker.lastNodeCheck != lastCheck)
					tracker.lastNodeCheck = lastCheck;
				}
				newPeer.send('check_offers', { tokens: tokens });
			}
		});

		
		this.nodes[ newPeer.generateToken() ] = newPeer;
		this.nodesOrdered.push(newPeer);
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