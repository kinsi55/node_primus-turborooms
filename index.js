exports.server = function(primus, options) {
	primus.rooms = {};

	const Spark = primus.Spark;

	/**
	 * Add the spark to the passed roomname
	 *
	 * @param {string} roomName Room to join
	 * @return {boolean} true if room was joined, false on error / spark is already in room
	 */
	Spark.prototype.join = function(roomName) {
		if(roomName === undefined)
			return false;

		if(!primus.rooms[roomName])
			primus.rooms[roomName] = [this.id];
		else if(primus.rooms[roomName].indexOf(this.id) === -1)
			primus.rooms[roomName].push(this.id);
		else
			return false;

		return true;
	};

	/**
	 * Remove the spark from the passed roomname
	 *
	 * @param {string} roomName Room to leave
	 * @return {boolean} true if room was left, false if room doesnt exist / spark wasnt in it
	 */
	Spark.prototype.leave = function(roomName) {
		if(!roomName || !primus.rooms[roomName])
			return false;

		let idx = primus.rooms[roomName].indexOf(this.id);

		if(idx === -1)
			return false;

		let prevLen = primus.rooms[roomName].length;

		//If theres only one client in the room we might as well skip splicing and just delete
		if(prevLen > 1)
			primus.rooms[roomName].splice(idx, 1);
		else
			delete primus.rooms[roomName];

		return true;
	};

	const uwsTransformer = primus.options.transformer === "uws";

	if(uwsTransformer)
		var {OPCODE_BINARY, OPCODE_TEXT} = require("uws");
	else if(!options.turborooms || !options.turborooms.ignoreNoUws)
		console.warn("[Primus-Turborooms] Turborooms is built with usage of the µWs transformer in mind as that allows for a significant increase in troughput when transmitting to many clients at once. If thats not viable for you just add `turborooms: {ignoreNoUws: true}` to your Primus init options");

	/**
	 * Write a new message.
	 *
	 * @param {Array} rooms Rooms whose clients should receive this message
	 * @param {mixed} data message to write
	 */
	primus.batchWrite = function(rooms, data) {
		primus.encoder(data, (err, packet) => {
			if(err || !packet) return;

			if(uwsTransformer)
				packet = primus.transformer.service.prepareMessage(packet, Buffer.isBuffer(packet) ? OPCODE_BINARY : OPCODE_TEXT);

			let sentTo = {};

			rooms.forEach((sparks) => {
				if(!primus.rooms[sparks])
					return;

				primus.rooms[sparks].forEach((spark) => {
					if(sentTo[spark])
						return;

					sentTo[spark] = true;

					spark = primus.connections[spark];

					if(!spark || /*Spark.CLOSED*/2 === spark.readyState)
						return;

					if(!uwsTransformer)
						return spark.emit("outgoing::data", packet); //Documented, tho unrecommended. Should be compatible with any transformer.

					primus.transformer.service.sendPrepared(spark.socket, packet); //This is it chief, sending 120kb msgpack 600x, 1ms instead of 25ms.
				});
			});

			if(uwsTransformer)
				primus.transformer.service.finalizeMessage(packet);
		});
	};

	/**
	 * Protocol-compatible method to write messages just like Primus-Emit would, but fast!
	 *
	 * @param {Array} rooms Rooms whose clients should receive this message
	 * @param {mixed} msg Name of the message
	 * @param {mixed} ...data parameters to write
	 */
	primus.batchEmit = function(rooms, msg, ...data) {
		primus.batchWrite(rooms, {emit: [msg, ...data]});
	};
};