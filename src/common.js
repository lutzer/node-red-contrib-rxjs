const EventEmitter = require('events');
const { tap } = require('rxjs/operators');

class NodeRedObservable extends EventEmitter {
    constructor(node) {
        super();
        this.globalContext = node.context().global;
        this.observableName = "observable." + node.id;
    }

    register($observable, multipart = 0) {
        const $withTap = $observable.pipe( tap( (val) => {
            this.emit('tap', val);
        }));
        this.globalContext.set(this.observableName, $withTap);
        this.multipart = multipart;


    }

    get pipeMessage() {
        return {
            topic: "pipe",
            payload: {
                observable : this.observableName,
                multipart : this.multipart
            }
        }
    }

    get returnMessage() {
        return {
            topic: "returns",
            payload: {
                observable: this.observableName
            }
        }
    }

    remove() {
        this.removeAllListeners("tap");
        this.globalContext.set(this.observableName, undefined);
    }
}

module.exports = {
    unsubscribe : function(subscription) {
        if (subscription !== undefined) 
            subscription.unsubscribe();

        subscription = undefined;
    },

    evalFunc : function(obj) {
        return Function('"use strict";return (' + obj + ')')();
    },

    NodeRedObservable : NodeRedObservable,
    ON_LOADED_TIMEOUT : 10
}