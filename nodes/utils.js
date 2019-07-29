module.exports = {
    unsubscribe : function(subscription) {
        if (subscription !== undefined) 
            subscription.unsubscribe();

        subscription = undefined;
    }
}