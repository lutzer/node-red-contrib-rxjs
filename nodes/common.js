module.exports = {
    unsubscribe : function(subscription) {
        if (subscription !== undefined) 
            subscription.unsubscribe();

        subscription = undefined;
    },

    ON_LOADED_TIMEOUT : 10
}