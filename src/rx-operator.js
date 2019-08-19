const { take, takeUntil, filter, scan, map, mapTo, 
        timeInterval, bufferCount, skip, repeat, timeout, 
        delay, catchError, retry, distinctUntilChanged } = require('rxjs/operators');
const { of } = require('rxjs');
const { NodeRedObservable, evalFunc, convertNodeRedType } = require('./common.js');
const _ = require('lodash');

module.exports = function (RED) {
	function RxNode (config) {
		RED.nodes.createNode(this, config);

        var node = this;
        var globalContext = node.context().global;

        function showState(state) {
            switch (state) {
                case "no-pipe":
                    node.status({ fill: "red", shape: "ring", text: "missing pipe"});
                    break;
                case "piped":
                    node.status({ fill: "green", shape: "dot", text: "piped"});
                    break;
                case "no-argument":
                    node.status({ fill: "yellow", shape: "ring", text: "missing argument"});
                case "no-operator":
                    node.status({ fill: "red", shape: "ring", text: "missing operator"});
                    break;
            }
        }

        var observableWrapper = new NodeRedObservable(node);

        observableWrapper.on('tap', (msg) => {
            node.send([null, msg]);
        });

        function sendPipeMessage() {
            node.send([observableWrapper.pipeMessage, null]);
        }

        if (config.operatorType === "none") 
            showState('no-operator');
        else
            showState("no-pipe");

        node.on('input', function (msg) {
            switch (config.operatorType) {
                case "bufferCount":
                    if (msg.topic === 'pipe') {
                        const $observable = globalContext.get(msg.payload.observable)
                        const bufferSize = _.toNumber(config.bufferCount_bufferSize);
                        const startEvery = _.toNumber(config.bufferCount_startEvery) > 0 ? _.toNumber(config.bufferCount_startEvery) : null;
                        if (bufferSize <= 0) {
                            node.error("buffer size must be bigger than 0.", msg)
                        }
                        observableWrapper.register(
                            $observable.pipe(
                                bufferCount(bufferSize, startEvery)
                            )
                        )
                        sendPipeMessage();
                        showState("piped");
                    }
                    break;
                case "catch":
                    if (msg.topic === 'pipe') {
                        const $observable = globalContext.get(msg.payload.observable)
                        try {
                            var catchFunc = new Function('error', config.catch_func);
                        } catch (err) {
                            node.error(err, msg);
                            break;
                        }
                        observableWrapper.register(
                            $observable.pipe(
                                catchError( (err) => {
                                    return of(catchFunc(err));
                                })
                            )
                        )
                        sendPipeMessage();
                        showState("piped");
                    }
                    break;
                case "delay":
                    if (msg.topic === 'pipe') {
                        const $observable = globalContext.get(msg.payload.observable)
                        const delayTime = _.toNumber(config.delay)
                        if (_.isNaN(delayTime) || delayTime <= 0) {
                            node.error("delay time must be bigger than 0", msg);
                            break;
                        }
                        observableWrapper.register(
                            $observable.pipe(
                                delay(delayTime)
                            )
                        )
                        sendPipeMessage();
                        showState("piped");
                    }
                    break;
                case "distinctUntilKeyChanged":
                    if (msg.topic === 'pipe') {
                        const $observable = globalContext.get(msg.payload.observable)
                        observableWrapper.register(
                            $observable.pipe(
                                distinctUntilChanged( (prev, curr) => {
                                    if (_.isEmpty(config.distinct_key))
                                        return _.isEqual(_.omit(prev, '_msgid'), _.omit(curr, '_msgid'));
                                    else
                                        return _.isEqual(_.get(prev, config.distinct_key), _.get(curr, config.distinct_key));
                                })
                            )
                        )
                        sendPipeMessage();
                        showState("piped");
                    }
                    break;
                case "mapTo":
                    if (msg.topic === 'pipe') {
                        try {
                            var payload = convertNodeRedType(config.mapTo_payload, config.mapTo_payloadType)
                        } catch (err) {
                            console.log(err)
                        }
                        
                        const $observable = globalContext.get(msg.payload.observable)
                        observableWrapper.register(
                            $observable.pipe(
                                mapTo({ topic: config.mapTo_topic, payload: payload })
                            )
                        )
                        sendPipeMessage();
                        showState("piped");
                    }
                    break;
                case "repeat":
                    if (msg.topic === 'pipe') {
                        const $observable = globalContext.get(msg.payload.observable)
                        let count = _.toNumber(config.repeat_count);
                        if (_.isNaN(count) || count <= 0) {
                            node.error("count must be bigger than 0", msg)
                            break;
                        }
                        observableWrapper.register(
                            $observable.pipe(
                                repeat(config.repeat_count)
                            )
                        )
                        sendPipeMessage();
                        showState("piped");
                    }
                    break;
                case "retry":
                    if (msg.topic === 'pipe') {
                        const $observable = globalContext.get(msg.payload.observable)
                        let number = _.toNumber(config.retry_number);
                        if (_.isNaN(number) || number < 1) {
                            node.error("number must be bigger than 0", msg)
                            break;
                        }
                        observableWrapper.register(
                            $observable.pipe(
                                retry(number)
                            )
                        )
                        sendPipeMessage();
                        showState("piped");
                    }
                    break;
                case "take":
                    if (msg.topic === 'pipe') {
                        const $observable = globalContext.get(msg.payload.observable)
                        let count = _.toNumber(config.take_count);
                        if (_.isNaN(count) || count < 1) {
                            node.error("count must be bigger than 0", msg)
                            break;
                        }
                        observableWrapper.register(
                            $observable.pipe(
                                take(count)
                            )
                        )
                        sendPipeMessage();
                        showState("piped");
                    }
                    break;
                case "takeUntil":
                    if (msg.topic === 'pipe') {
                        node.$pipeObservable = globalContext.get(msg.payload.observable)
                        showState("no-argument");
                    } else if (msg.topic === 'until') {
                        node.$untilObservable = globalContext.get(msg.payload.observable)
                        showState("no-pipe");
                    }
                    if (node.$pipeObservable && node.$untilObservable) {
                        showState("piped");
                        observableWrapper.register(
                            node.$pipeObservable.pipe(
                                takeUntil(node.$untilObservable)
                            )
                        )
                        sendPipeMessage()
                    }
                    break;
                case "filter":
                    if (msg.topic === 'pipe') {
                        const $observable = globalContext.get(msg.payload.observable)
                        const filterFunc = new Function('msg', config.filter_func);
                        observableWrapper.register(
                            $observable.pipe(
                                filter( (msg) => {
                                    return filterFunc(msg);
                                })
                            )
                        )
                        sendPipeMessage()
                        showState("piped");
                    }
                    break;
                case "scan":
                    if (msg.topic === 'pipe') {
                        const $observable = globalContext.get(msg.payload.observable)
                        const scanFunc = new Function('acc', 'msg', config.scan_func);
                        const scanSeed = convertNodeRedType(config.scan_seed, config.scan_seedType)
                        observableWrapper.register(
                            $observable.pipe(
                                scan( (acc, msg) => {
                                    return scanFunc(acc, msg);
                                }, scanSeed),
                                map( (val) => {
                                    if (_.has(val, 'payload'))
                                        return val;
                                    else
                                        return { payload : val }
                                })
                            )
                        )
                        sendPipeMessage()
                        showState("piped");
                    }
                    break;
                case "skip":
                    if (msg.topic === 'pipe') {
                        const $observable = globalContext.get(msg.payload.observable)
                        observableWrapper.register(
                            $observable.pipe(
                                skip(config.skip_count)
                            )
                        )
                        sendPipeMessage();
                        showState("piped");
                    }
                    break;
                case "timeInterval":
                    if (msg.topic === 'pipe') {
                        const $observable = globalContext.get(msg.payload.observable)
                        observableWrapper.register(
                            $observable.pipe(
                                timeInterval(),
                                map( (val) => {
                                    const result = val.value;
                                    result.interval = val.interval;
                                    return result;
                                })
                            )
                        )
                        sendPipeMessage()
                        showState("piped");
                    }
                    break;
                case "timeout":
                    if (msg.topic === 'pipe') {
                        const $observable = globalContext.get(msg.payload.observable)
                        observableWrapper.register(
                            $observable.pipe(
                                timeout(config.timeout)
                            )
                        )
                        sendPipeMessage()
                        showState("piped");
                    }
                    break;
                default:
                    showState("no-operator")
            }	
        });

		node.on('close', function () {
            observableWrapper.remove();
		});
	}
	RED.nodes.registerType("rx operator", RxNode);
};
