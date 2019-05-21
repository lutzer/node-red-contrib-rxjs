const { Subject } = require('rxjs');

module.exports = function (RED) {
	function RxObservableNode (config) {
		RED.nodes.createNode(this, config);

		var node = this;
		var nodeContext = this.context();

        nodeContext.subject = new Subject();
        nodeContext.subsciption = nodeContext.subject.subscribe((val) => {
            var msg = { payload: val };
            console.log(msg);
            node.send([null,msg])
        });

		node.on('input', function (msg) {
			if (msg.topic === 'next') {
				nodeContext.subject.next(msg.payload);
			} else if (msg.topic === "complete" ) {
                nodeContext.subject.complete();
            }
		});

		node.on('close', function () {
			nodeContext.subscription.unsubscribe();
		});
	}
	RED.nodes.registerType("rx-observable", RxObservableNode);
};
