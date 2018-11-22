# Turborooms - Basic rooms extension for Primus with focus on Performance / Efficiency

## Lore

Primus, in itself, is a great project however there was one thing bugging me about it: A lot of unused potentional in terms of performance because of its compatability with many transformers and de-/serializers.

I for my part always use the µWs transformer which in itself already has an edge in performance over the other transformers, but it also offers methods to prepare and then send that already prepared message to multiple clients. Primus-rooms could make use of that but I suppose it doesnt to have the code be in-line with the other transformers / documented endpoints: https://github.com/cayasso/primus-rooms-adapter/blob/master/lib/index.js#L200

However, it has another major flaw: Since the message is sent to every recipient trough the documented interfaces, **The Serializer gets called for every single client that you try to submit to**: https://github.com/primus/primus/blob/master/spark.js#L441

This obviously massively hinders troughput as the same message has to get encoded over and over again for every client that will receive it. This is neither really a fault of Primus, nor is it one of Primus-rooms, its merely something that I felt I could improve on for my exact use-case, and thought I might as well share it :)

## Usage

Things to keep in mind:

- **Sparks are not automatically removed from the room(s) they are in**. You need to manually handle a sparks `end` event and call the `.leave(roomname)` method for every room that the spark either, is in, or could be in. With my use-case the rooms a spark could be in are known / available from the `end` event (Simply added onto the Spark object) hence I made this decision so I dont have to maintain a second `spark: rooms` relation. **Failing this step almost certainly will cause memory leaks and / or weird behaviour**.
- Turborooms uses some undocumented, and some privately marked endpoints, so it may or may not break with future versions.
- Turborooms is **very** barebones by itself, however has included support for the First-party `Primus-Emit` plugin: https://github.com/primus/primus-emit
- You can use Turborooms with any transformer, not just µWs, other transformers are going to miss out on its improvements. If you wish to use a different transformer other than µWs add "turborooms: {ignoreNoUws: true}" to your Primus `options` parameter when initializing.
- This is merely implementing the things that I needed. If you miss something that could be added onto it without decreasing performance of anything thats already in the plugin I'd love to accept your Pullrequest!

Tip:

From my tests, using MessagePack in itself is slower than JSON when it comes to serialization, but µWs has an easier time transmitting it than a JSON string, thus netting a performance improvement. Might need more testing.

## Methods / Variables

#### Primus.rooms

Turborooms' Object used to maintain rooms and their clients. Structure:

```{Roomname: [Spark1, Spark2, ...]}```

#### Spark.join(roomname)

Add the spark to the passed roomname

#### Spark.leave(roomname)

Remove the spark from the passed roomname

#### Primus.batchWrite(rooms, data)

Write the passed data to all the clients in the passed room(s), similar to how Primus.write works

#### Primus.batchEmit(rooms, message, ...data)

Wrapper calling .batchWrite for a hacky implementation / replication of the [Primus-emit .emit style](https://github.com/primus/primus-emit#broadcasting) message emitting.

## License

MIT