/**
 * Created by Roman on 20.05.2015.
 */
/**
 * Created by Roman on 04.05.2015.
 */
define(['Validation', 'common'], function (Validation, common, helpers) {
    var PaymentModel = Backbone.Model.extend({
        idAttribute: "_id",
        initialize: function () {

        },
        defaults: {
            supplier: null,
            paidAmount: 0,
            paymentMethod: null,
            date: new Date(),
            name: 'PP',
            period: null,
            paymentRef: null,
            differenceAmount: 0,
            invoice: null,
            invoiced: 0
        },
        urlRoot: function () {
            return "/payment";
        },
        parse: function (model) {
            var differenceAmount = model.differenceAmount || 0;
            var paidAmount = model.paidAmount || 0;
            var invoiced;

            differenceAmount = differenceAmount/ 100;
            paidAmount = paidAmount/100;
            invoiced = paidAmount + differenceAmount;

            differenceAmount = differenceAmount.toFixed(2);
            paidAmount = paidAmount.toFixed(2);
            invoiced = invoiced.toFixed(2);

            model.differenceAmount = differenceAmount;
            model.paidAmount = paidAmount;
            model.invoiced = invoiced;

            if (model.date) {
                model.date = common.utcDateToLocaleDate(model.date);
            }


            return model;
        }
    });

    return PaymentModel;
});