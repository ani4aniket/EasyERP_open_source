/**
 * Created by Roman on 17.06.2015.
 */
define([
    'text!templates/Revenue/index.html',
    'text!templates/Revenue/weeksArray.html',
    'text!templates/Revenue/tableByDep.html',
    'text!templates/Revenue/bySalesByDep.html',
    'text!templates/Revenue/perWeek.html',
    'text!templates/Revenue/paidBySales.html',
    'text!templates/Revenue/paidBySalesItems.html',
    'text!templates/Revenue/projectBySalesItems.html',
    'text!templates/Revenue/unpaidBySales.html',
    'text!templates/Revenue/monthsArray.html',
    'text!templates/Revenue/perMonth.html',
    'text!templates/Revenue/perMonthInt.html',
    'text!templates/Revenue/tableSold.html',
    'text!templates/Revenue/hoursByDepItem.html',
    'text!templates/Revenue/hoursByDepTotal.html',
    'models/Revenue',
    'moment',
    'dataService',
    'async',
    'custom',
    'd3'
], function (mainTemplate, weeksArray, tableByDep, bySalesByDep, perWeek, paidBySales, paidBySalesItems, projectBySalesItems, unpaidBySales, monthsArray, perMonth, perMonthInt, tableSold, hoursByDepItem, hoursByDepTotal, RevenueModel, moment, dataService, async, custom, d3) {
    var View = Backbone.View.extend({
        el: '#content-holder',

        template: _.template(mainTemplate),
        weeksArrayTemplate: _.template(weeksArray),
        monthsArrayTemplate: _.template(monthsArray),
        bySalesByDepTemplate: _.template(bySalesByDep),
        tableByDepTemplate: _.template(tableByDep),
        bySalesPerWeekTemplate: _.template(perWeek),
        bySalesPerMonthTemplate: _.template(perMonth),
        bySalesPerMonthIntTemplate: _.template(perMonthInt),
        paidBySalesTemplate: _.template(paidBySales),
        paidBySalesItemsTemplate: _.template(paidBySalesItems),
        projectBySalesItemsTemplate: _.template(projectBySalesItems),
        tableSoldTemplate: _.template(tableSold),
        hoursByDepTemplate: _.template(hoursByDepItem),
        hoursByDepTotalTemplate: _.template(hoursByDepTotal),

        paidUnpaidDateRange: {},

        $currentStartWeek: null,
        $revenueBySales: null,

        events: {
            'change #currentStartWeek': 'changeWeek',
            'click .ui-spinner-button': 'changeWeek'
        },

        initialize: function () {
            var self = this;
            var currentWeek = moment().week();
            var nowMonth = parseInt(moment().week(currentWeek).format("MM"));

            this.model = new RevenueModel();
            this.listenTo(this.model, 'change:currentYear', this.changeYear);
            this.listenTo(this.model, 'change:currentStartWeek', this.changeWeek);
            this.listenTo(this.model, 'change:weeksArr', this.changeWeeksArr);
            this.listenTo(this.model, 'change:bySalesData', this.changeBySalesData);
            this.listenTo(this.model, 'change:byDepData', this.changeByDepData);
            this.listenTo(this.model, 'change:paidBySales', this.changePaidBySalesData);
            this.listenTo(this.model, 'change:unpaidBySales', this.changeUnpaidBySalesData);
            this.listenTo(this.model, 'change:cancelledBySales', this.changeCancelledBySalesData);
            this.listenTo(this.model, 'change:projectBySales', this.changeProjectBySales);
            this.listenTo(this.model, 'change:employeeBySales', this.changeEmployeeBySales);
            this.listenTo(this.model, 'change:hoursByDep', this.changeHoursByDep);

            var currentStartWeek = currentWeek - 6;
            var currentYear = moment().weekYear();
            var currentMonth = parseInt(moment().week(currentStartWeek).format("MM"));

            this.changeWeek = _.debounce(this.updateWeek, 500);

            dataService.getData('/employee/bySales', null, function (employess) {
                self.render(employess);
                self.model.set({
                    currentStartWeek: currentStartWeek,
                    currentYear: currentYear,
                    currentMonth: currentMonth
                });
                self.$currentStartWeek.val(currentStartWeek);
            });

            this.monthArr = [];
            this.paidUnpaidDateRange.endDate = currentYear * 100 + nowMonth;

            this.calculateCurrentMonthArr(nowMonth, currentYear);
        },

        getDate: function (num) {
            return moment().day("Monday").week(num).format("DD.MM");
        },

        getModelValue: function (attr) {
            return this.model.get(attr);
        },

        updateWeek: function () {
            var modelData;
            var currentStartWeek = parseInt(this.$currentStartWeek.val());
            var currentWeek = currentStartWeek + 6;
            var currentYear = this.model.get('currentYear');
            var newCurrMonth;
            var yearOfMonth;

            if (currentStartWeek || currentStartWeek === 0) {
                if (currentStartWeek > 53) {
                    currentStartWeek = 1;
                    currentYear += 1;
                }
                if (currentStartWeek < 1) {
                    currentStartWeek = 53;
                    currentYear -= 1;
                }
            }
            if (currentYear < 2014) {
                currentYear = 2014;
            }

            newCurrMonth = parseInt(moment().week(currentWeek).format("MM"));

            if (currentStartWeek === 1) {
                yearOfMonth = currentYear - 1;
            } else {
                yearOfMonth = currentYear;
            }

            modelData = {
                currentStartWeek: currentStartWeek,
                currentYear: currentYear,
                yearOfMonth: yearOfMonth,
                newCurrMonth: newCurrMonth
            };

            this.calculateCurrentMonthArr(newCurrMonth, currentYear);

            this.model.set(modelData);

            return false;
        },

        calculateCurrentMonthArr: function (nowMonth, currentYear) {
            this.monthArr = [];
            this.paidUnpaidDateRange.endDate = currentYear * 100 + nowMonth;

            for (var i = 0; i < 12; i++) {
                if (nowMonth - i <= 0) {
                    this.paidUnpaidDateRange.startDate = (currentYear - 1) * 100 + (nowMonth - i + 12);
                    this.monthArr.push({
                        month: nowMonth - i + 12,
                        year: currentYear - 1
                    });
                } else {
                    this.monthArr.push({
                        month: nowMonth - i,
                        year: currentYear
                    });
                }
            }

            this.monthArr = _.sortBy(this.monthArr, function (monthObject) {
                return monthObject.year * 100 + monthObject.month
            });

            this.fetchPaidBySales();
            this.fetchUnpaidBySales();
            this.fetchCancelledBySales();
            this.fetchProjectBySales();
            this.fetchEmployeeBySales();
        },

        changeWeek: function () {
            var prevVal = this.model.previous('currentStartWeek');
            var weekVal = this.model.get('currentStartWeek');

            if (prevVal === 53 || prevVal === 1) {
                this.$currentStartWeek.val(weekVal);
            }

            this.sendRequest();
        },

        changeYear: function () {
            var thisEl = this.$el;
            var year = thisEl.find('#currentYear');
            var yearVal = this.model.get('currentYear');

            year.text(yearVal);
        },

        changeWeeksArr: function () {
            var self = this;
            this.weekArr = this.getModelValue('weeksArr');

            if (!this.rendered) {
                return setTimeout(function () {
                    self.changeWeeksArr();
                }, 10);
            }
            this.$revenueBySales = this.$el.find('div.revenueBySales');
            this.$revenueBySales.html(this.weeksArrayTemplate({weeksArr: this.weekArr}));
        },

        sendRequest: function () {
            var model = this.model.toJSON();
            var weeksArr = [];
            var week;

            if (model.currentMonth !== model.newCurrMonth) {
                model.currentMonth = model.newCurrMonth;
            }

            for (var i = 0; i <= 13; i++) {
                if (model.currentStartWeek + i > 53) {
                    week = model.currentStartWeek + i - 53;
                    weeksArr.push({
                        lastDate: this.getDate(week),
                        week: week,
                        year: model.currentYear + 1
                    });
                } else {
                    week = model.currentStartWeek + i;
                    weeksArr.push({
                        lastDate: this.getDate(week),
                        week: week,
                        year: model.currentYear
                    });
                }
            }

            this.fetchBySales();
            this.fetchByDeps();
            this.fetchhoursByDep();

            this.model.set('weeksArr', weeksArr);

            custom.cashToApp('weeksArr', weeksArr);
        },

        fetchBySales: function () {
            var self = this;
            var data = {
                week: this.model.get('currentStartWeek'),
                year: this.model.get('currentYear')
            };

            dataService.getData('/revenue/bySales', data, function (bySalesData) {
                self.model.set('bySalesData', bySalesData);
                self.model.trigger('change:bySalesData');
            });
        },

        fetchByDeps: function () {
            var self = this;
            var data = {
                week: this.model.get('currentStartWeek'),
                year: this.model.get('currentYear')
            };

            dataService.getData('/revenue/byDepartment', data, function (byDepData) {
                self.model.set('byDepData', byDepData);
                self.model.trigger('change:byDepData');
            });
        },

        fetchPaidBySales: function () {
            var self = this;
            var data = this.paidUnpaidDateRange;

            dataService.getData('/revenue/paidwtrack', data, function (byDepData) {
                self.model.set('paidBySales', byDepData);
                self.model.trigger('change:paidBySales');
            });
        },

        fetchUnpaidBySales: function () {
            var self = this;
            var data = this.paidUnpaidDateRange;

            dataService.getData('/revenue/unpaidwtrack', data, function (byDepData) {
                self.model.set('unpaidBySales', byDepData);
                self.model.trigger('change:unpaidBySales');
            });
        },

        fetchCancelledBySales: function () {
            var self = this;
            var data = this.paidUnpaidDateRange;

            dataService.getData('/revenue/cancelledWtrack', data, function (byDepData) {
                self.model.set('cancelledBySales', byDepData);
                self.model.trigger('change:cancelledBySales');
            });
        },

        fetchProjectBySales: function () {
            var self = this;
            var data = this.paidUnpaidDateRange;

            //ToDo Request
            dataService.getData('/revenue/projectBySales', data, function (byDepData) {
                self.model.set('projectBySales', byDepData);
                self.model.trigger('change:projectBySales');
            });
        },

        fetchEmployeeBySales: function () {
            var self = this;
            var data = this.paidUnpaidDateRange;

            //ToDo Request
            dataService.getData('/revenue/employeeBySales', data, function (byDepData) {
                self.model.set('employeeBySales', byDepData);
                self.model.trigger('change:employeeBySales');
            });
        },

        fetchhoursByDep: function () {
            var self = this;
            var data = {
                week: this.model.get('currentStartWeek'),
                year: this.model.get('currentYear')
            };

            dataService.getData('/revenue/hoursByDep', data, function (hoursByDep) {
                self.model.set('hoursByDep', hoursByDep);
                self.model.trigger('change:hoursByDep');
            });
        },

        changeBySalesData: function () {
            var self = this;
            var weeksArr = this.model.get('weeksArr');
            var bySalesByDep = this.model.get('bySalesData');
            var target = self.$el.find('#tableBySales');
            var targetTotal = self.$el.find('[data-content="totalBySales"]');

            var bySalesByDepPerWeek = {};
            var tempPerWeek;
            var globalTotal = 0;

            async.each(this.employees, function (employee, cb) {
                var employeeId = employee._id;
                var employeeContainer = target.find('[data-id="' + employeeId + '"]');

                var byWeekData;
                var total;
                var bySalesByDepPerEmployee;


                bySalesByDepPerEmployee = _.find(bySalesByDep, function (el) {
                    return el._id === employeeId;
                });


                if (bySalesByDepPerEmployee) {
                    byWeekData = _.groupBy(bySalesByDepPerEmployee.root, 'week');
                    total = bySalesByDepPerEmployee.total;
                    globalTotal += total;
                    employeeContainer.html(self.bySalesByDepTemplate({
                        weeksArr: weeksArr,
                        byWeekData: byWeekData,
                        total: total,
                        bySalesByDepPerWeek: bySalesByDepPerWeek
                    }));
                }
                cb();
            }, function (err) {
                if (err) {
                    alert(err);
                }

                for (var i = bySalesByDep.length - 1; i >= 0; i--) {
                    tempPerWeek = bySalesByDep[i].root;
                    tempPerWeek.forEach(function (weekResault) {
                        if (!(weekResault.week in bySalesByDepPerWeek)) {
                            bySalesByDepPerWeek[weekResault.week] = weekResault.revenue;
                        } else {
                            bySalesByDepPerWeek[weekResault.week] += weekResault.revenue;
                        }
                    });
                }

                targetTotal.html(self.bySalesPerWeekTemplate({
                    weeksArr: weeksArr,
                    bySalesByDepPerWeek: bySalesByDepPerWeek,
                    globalTotal: globalTotal
                }));

                return false;
            });
        },

        changeByDepData: function () {
            var self = this;
            var weeksArr = this.model.get('weeksArr');
            var bySalesByDep = this.model.get('byDepData');

            var target = self.$el.find('#tableByDep');
            var targetTotal;

            var bySalesByDepPerWeek = {};
            var tempPerWeek;
            var globalTotal = 0;

            this.departments = [];

            for (var i = bySalesByDep.length - 1; i >= 0; i--) {
                this.departments.push(bySalesByDep[i]._id);

                tempPerWeek = bySalesByDep[i].root;
                tempPerWeek.forEach(function (weekResault) {
                    if (!(weekResault.week in bySalesByDepPerWeek)) {
                        bySalesByDepPerWeek[weekResault.week] = weekResault.revenue;
                    } else {
                        bySalesByDepPerWeek[weekResault.week] += weekResault.revenue;
                    }
                });
            }

            target.html(this.tableByDepTemplate({departments: this.departments}));
            target.find('div.revenueBySales').html(this.weeksArrayTemplate({weeksArr: this.weekArr}));
            targetTotal = $(self.$el.find('[data-content="totalByDep"]'));

            async.each(this.departments, function (department, cb) {
                var target = $('#tableByDep').find('[data-id="' + department + '"]');

                var byWeekData;
                var total;
                var bySalesByDepPerEmployee;


                bySalesByDepPerEmployee = _.find(bySalesByDep, function (el) {
                    return el._id === department;
                });


                if (bySalesByDepPerEmployee) {
                    byWeekData = _.groupBy(bySalesByDepPerEmployee.root, 'week');
                    total = bySalesByDepPerEmployee.total;
                    globalTotal += total;
                    target.html(self.bySalesByDepTemplate({
                        weeksArr: weeksArr,
                        byWeekData: byWeekData,
                        total: total,
                        bySalesByDepPerWeek: bySalesByDepPerWeek
                    }));
                }
                cb();
            }, function (err) {
                if (err) {
                    alert(err);
                }

                targetTotal.html(self.bySalesPerWeekTemplate({
                    weeksArr: weeksArr,
                    bySalesByDepPerWeek: bySalesByDepPerWeek,
                    globalTotal: globalTotal
                }));

                self.completeDep();

                return false;
            });
        },

        changePaidBySalesData: function () {
            var self = this;
            var paidBySales = this.model.get('paidBySales');
            var monthArr = this.monthArr;
            var target = self.$el.find('#tablePaidBySales');
            var targetTotal;
            var monthContainer;

            var bySalesByDepPerWeek = {};
            var tempPerMonth;
            var globalTotal = 0;

            target.html(this.paidBySalesTemplate({
                employees: self.employees,
                content: 'totalPaidBySales',
                className: 'totalPaid',
                headName: 'Paid WTrack'
            }));
            //target.find('div.revenueBySales').html(this.weeksArrayTemplate({weeksArr: this.weekArr}));
            targetTotal = $(self.$el.find('[data-content="totalPaidBySales"]'));
            monthContainer = target.find('.monthContainer');
            monthContainer.html(this.monthsArrayTemplate({monthArr: monthArr}));

            async.each(this.employees, function (employee, cb) {
                var employeeId = employee._id;
                var employeeContainer = target.find('[data-id="' + employeeId + '"]');

                var byMonthData;
                var total;
                var bySalesByDepPerEmployee;


                bySalesByDepPerEmployee = _.find(paidBySales, function (el) {
                    return el._id === employeeId;
                });


                if (bySalesByDepPerEmployee) {
                    byMonthData = _.groupBy(bySalesByDepPerEmployee.root, 'month');
                    total = bySalesByDepPerEmployee.total;
                    globalTotal += total;
                    employeeContainer.html(self.paidBySalesItemsTemplate({
                        monthArr: monthArr,
                        byMonthData: byMonthData,
                        total: total
                    }));
                }
                cb();
            }, function (err) {

                if (err) {
                    alert(err);
                }

                for (var i = paidBySales.length - 1; i >= 0; i--) {
                    tempPerMonth = paidBySales[i].root;
                    tempPerMonth.forEach(function (weekResault) {
                        if (!(weekResault.month in bySalesByDepPerWeek)) {
                            bySalesByDepPerWeek[weekResault.month] = weekResault.revenue;
                        } else {
                            bySalesByDepPerWeek[weekResault.month] += weekResault.revenue;
                        }
                    });
                }

                targetTotal.html(self.bySalesPerMonthTemplate({
                    monthArr: monthArr,
                    bySalesByDepPerWeek: bySalesByDepPerWeek,
                    globalTotal: globalTotal,
                    totalName: 'Paid Total'
                }));

                return false;
            });
        },

        changeCancelledBySalesData: function () {
            var self = this;
            var unpaidBySales = this.model.get('cancelledBySales');
            var monthArr = this.monthArr;
            var target = self.$el.find('#tableCancelledBySales');
            var targetTotal;
            var monthContainer;

            var bySalesByDepPerWeek = {};
            var tempPerMonth;
            var globalTotal = 0;

            target.html(this.paidBySalesTemplate({
                employees: self.employees,
                content: 'totalCancelledBySales',
                className: 'totalUnpaid',
                headName: 'Write Off'
            }));
            target.find('div.revenueBySales').html(this.weeksArrayTemplate({weeksArr: this.weekArr}));
            targetTotal = $(self.$el.find('[data-content="totalCancelledBySales"]'));
            monthContainer = target.find('.monthContainer');
            monthContainer.html(this.monthsArrayTemplate({monthArr: monthArr}));

            async.each(this.employees, function (employee, cb) {
                var employeeId = employee._id;
                var employeeContainer = target.find('[data-id="' + employeeId + '"]');

                var byMonthData;
                var total;
                var bySalesByDepPerEmployee;


                bySalesByDepPerEmployee = _.find(unpaidBySales, function (el) {
                    return el._id === employeeId;
                });


                if (bySalesByDepPerEmployee) {
                    byMonthData = _.groupBy(bySalesByDepPerEmployee.root, 'month');
                    total = bySalesByDepPerEmployee.total;
                    globalTotal += total;
                    employeeContainer.html(self.paidBySalesItemsTemplate({
                        monthArr: monthArr,
                        byMonthData: byMonthData,
                        total: total
                    }));
                }
                cb();
            }, function (err) {

                if (err) {
                    alert(err);
                }

                for (var i = unpaidBySales.length - 1; i >= 0; i--) {
                    tempPerMonth = unpaidBySales[i].root;
                    tempPerMonth.forEach(function (weekResault) {
                        if (!(weekResault.month in bySalesByDepPerWeek)) {
                            bySalesByDepPerWeek[weekResault.month] = weekResault.revenue;
                        } else {
                            bySalesByDepPerWeek[weekResault.month] += weekResault.revenue;
                        }
                    });
                }

                targetTotal.html(self.bySalesPerMonthTemplate({
                    monthArr: monthArr,
                    bySalesByDepPerWeek: bySalesByDepPerWeek,
                    globalTotal: globalTotal,
                    totalName: 'Write Off Total'
                }));

                return false;
            });
        },

        changeUnpaidBySalesData: function () {
            var self = this;
            var unpaidBySales = this.model.get('unpaidBySales');
            var monthArr = this.monthArr;
            var target = self.$el.find('#tableUnpaidBySales');
            var targetTotal;
            var monthContainer;

            var bySalesByDepPerWeek = {};
            var tempPerMonth;
            var globalTotal = 0;

            target.html(this.paidBySalesTemplate({
                employees: self.employees,
                content: 'totalUnPaidBySales',
                className: 'totalUnpaid',
                headName: 'Unpaid WTrack'
            }));
            /* target.find('div.revenueBySales').html(this.weeksArrayTemplate({weeksArr: this.weekArr}));*/
            targetTotal = $(self.$el.find('[data-content="totalUnPaidBySales"]'));
            monthContainer = target.find('.monthContainer');
            monthContainer.html(this.monthsArrayTemplate({monthArr: monthArr}));

            async.each(this.employees, function (employee, cb) {
                var employeeId = employee._id;
                var employeeContainer = target.find('[data-id="' + employeeId + '"]');

                var byMonthData;
                var total;
                var bySalesByDepPerEmployee;


                bySalesByDepPerEmployee = _.find(unpaidBySales, function (el) {
                    return el._id === employeeId;
                });


                if (bySalesByDepPerEmployee) {
                    byMonthData = _.groupBy(bySalesByDepPerEmployee.root, 'month');
                    total = bySalesByDepPerEmployee.total;
                    globalTotal += total;
                    employeeContainer.html(self.paidBySalesItemsTemplate({
                        monthArr: monthArr,
                        byMonthData: byMonthData,
                        total: total
                    }));
                }
                cb();
            }, function (err) {

                if (err) {
                    alert(err);
                }

                for (var i = unpaidBySales.length - 1; i >= 0; i--) {
                    tempPerMonth = unpaidBySales[i].root;
                    tempPerMonth.forEach(function (weekResault) {
                        if (!(weekResault.month in bySalesByDepPerWeek)) {
                            bySalesByDepPerWeek[weekResault.month] = weekResault.revenue;
                        } else {
                            bySalesByDepPerWeek[weekResault.month] += weekResault.revenue;
                        }
                    });
                }

                targetTotal.html(self.bySalesPerMonthTemplate({
                    monthArr: monthArr,
                    bySalesByDepPerWeek: bySalesByDepPerWeek,
                    globalTotal: globalTotal,
                    totalName: 'UnPaid Total'
                }));

                return false;
            });
        },

        changeProjectBySales: function () {
            var self = this;
            var projectBySales = this.model.get('projectBySales');
            var monthArr = this.monthArr;
            var target = self.$el.find('#tableProjectBySales');
            var targetTotal;
            var monthContainer;

            var bySalesByDepPerWeek = {};
            var tempPerMonth;
            var globalTotal = 0;

            target.html(this.paidBySalesTemplate({
                employees: self.employees,
                content: 'totalProjectBySales',
                className: 'totalProject',
                headName: 'Project by Sales'
            }));

            targetTotal = $(self.$el.find('[data-content="totalProjectBySales"]'));
            monthContainer = target.find('.monthContainer');
            monthContainer.html(this.monthsArrayTemplate({monthArr: monthArr}));

            async.each(self.employees, function (employee, cb) {
                var employeeId = employee._id;
                var employeeContainer = target.find('[data-id="' + employeeId + '"]');

                var byMonthData;
                var total;
                var bySalesByDepPerEmployee;


                bySalesByDepPerEmployee = _.find(projectBySales, function (el) {
                    return el._id === employeeId;
                });


                if (bySalesByDepPerEmployee) {
                    byMonthData = _.groupBy(bySalesByDepPerEmployee.root, 'month');
                    total = bySalesByDepPerEmployee.total;
                    globalTotal += total;
                    employeeContainer.html(self.projectBySalesItemsTemplate({
                        monthArr: monthArr,
                        byMonthData: byMonthData,
                        total: total
                    }));
                }
                cb();
            }, function (err) {

                if (err) {
                    alert(err);
                }

                for (var i = projectBySales.length - 1; i >= 0; i--) {
                    tempPerMonth = projectBySales[i].root;
                    tempPerMonth.forEach(function (weekResault) {
                        if (!(weekResault.month in bySalesByDepPerWeek)) {
                            bySalesByDepPerWeek[weekResault.month] = weekResault.projectCount;
                        } else {
                            bySalesByDepPerWeek[weekResault.month] += weekResault.projectCount;
                        }
                    });
                }

                targetTotal.html(self.bySalesPerMonthIntTemplate({
                    monthArr: monthArr,
                    bySalesByDepPerWeek: bySalesByDepPerWeek,
                    globalTotal: globalTotal,
                    totalName: 'Projects Total'
                }));

                return false;
            });
        },

        changeEmployeeBySales: function () {
            var self = this;
            var employeeBySales = this.model.get('employeeBySales');
            var monthArr = this.monthArr;
            var target = self.$el.find('#tableEmployeeBySales');
            var targetTotal;
            var monthContainer;

            var bySalesByDepPerWeek = {};
            var tempPerMonth;
            var globalTotal = 0;

            target.html(this.paidBySalesTemplate({
                employees: self.employees,
                content: 'totalEmployeeBySales',
                className: 'totalEmployee',
                headName: 'Employee by Sales'
            }));
            targetTotal = $(self.$el.find('[data-content="totalEmployeeBySales"]'));
            monthContainer = target.find('.monthContainer');
            monthContainer.html(this.monthsArrayTemplate({monthArr: monthArr}));

            async.each(self.employees, function (employee, cb) {
                var employeeId = employee._id;
                var employeeContainer = target.find('[data-id="' + employeeId + '"]');

                var byMonthData;
                var total;
                var bySalesByDepPerEmployee;


                bySalesByDepPerEmployee = _.find(employeeBySales, function (el) {
                    return el._id === employeeId;
                });


                if (bySalesByDepPerEmployee) {
                    byMonthData = _.groupBy(bySalesByDepPerEmployee.root, 'month');
                    total = bySalesByDepPerEmployee.total;
                    globalTotal += total;
                    employeeContainer.html(self.projectBySalesItemsTemplate({
                        monthArr: monthArr,
                        byMonthData: byMonthData,
                        total: total
                    }));
                }
                cb();
            }, function (err) {

                if (err) {
                    alert(err);
                }

                for (var i = employeeBySales.length - 1; i >= 0; i--) {
                    tempPerMonth = employeeBySales[i].root;
                    tempPerMonth.forEach(function (weekResault) {
                        if (!(weekResault.month in bySalesByDepPerWeek)) {
                            bySalesByDepPerWeek[weekResault.month] = weekResault.projectCount;
                        } else {
                            bySalesByDepPerWeek[weekResault.month] += weekResault.projectCount;
                        }
                    });
                }

                targetTotal.html(self.bySalesPerMonthIntTemplate({
                    monthArr: monthArr,
                    bySalesByDepPerWeek: bySalesByDepPerWeek,
                    globalTotal: globalTotal,
                    totalName: 'Employee Total'
                }));

                return false;
            });
        },

        changeHoursByDep: function () {
            var self = this;
            var weeksArr = this.model.get('weeksArr');
            var hoursByDep = this.model.get('hoursByDep');

            var target = self.$el.find('#tableHoursByDep');
            var targetTotal;

            var hoursByDepPerWeek = {};
            var tempPerWeek;
            var globalTotal = 0;

            this.departments = [];

            for (var i = hoursByDep.length - 1; i >= 0; i--) {
                this.departments.push(hoursByDep[i]._id);

                tempPerWeek = hoursByDep[i].root;
                tempPerWeek.forEach(function (weekResault) {
                    if (!(weekResault.week in hoursByDepPerWeek)) {
                        hoursByDepPerWeek[weekResault.week] = weekResault.sold;
                    } else {
                        hoursByDepPerWeek[weekResault.week] += weekResault.sold;
                    }
                });
            }

            target.html(this.tableSoldTemplate({departments: this.departments}));
            target.find('div.revenueBySales').html(this.weeksArrayTemplate({weeksArr: this.weekArr}));
            targetTotal = $(target.find('[data-content="totalHoursByDep"]'));

            async.each(this.departments, function (department, cb) {
                var target = $('#tableHoursByDep').find('[data-id="' + department + '"]');

                var byWeekData;
                var total;
                var hoursByDepPerEmployee;


                hoursByDepPerEmployee = _.find(hoursByDep, function (el) {
                    return el._id === department;
                });


                if (hoursByDepPerEmployee) {
                    byWeekData = _.groupBy(hoursByDepPerEmployee.root, 'week');
                    total = hoursByDepPerEmployee.totalSold;
                    globalTotal += total;
                    target.html(self.hoursByDepTemplate({
                        weeksArr: weeksArr,
                        byWeekData: byWeekData,
                        total: total,
                        bySalesByDepPerWeek: hoursByDepPerWeek
                    }));
                }
                cb();
            }, function (err) {
                if (err) {
                    alert(err);
                }

                targetTotal.html(self.hoursByDepTotalTemplate({
                    weeksArr: weeksArr,
                    bySalesByDepPerWeek: hoursByDepPerWeek,
                    globalTotal: globalTotal
                }));

                return false;
            });
        },

        completeDep: function () {
            var self = this;
            var data = [];
            var data2 = [];
            var data3 = [];
            var data4 = [];
            var maxdata = 0;
            var weeksArr = this.model.get('weeksArr');
            var weekLength = weeksArr.length;
            var dataByDep = _.groupBy(self.model.get('byDepData'),'_id');
            var keys = Object.keys(dataByDep);
            var keysLength = keys.length - 1;

            for (var i = keysLength; i >= 0; i--) {
                dataByDep[keys[i]] = _.groupBy(dataByDep[keys[i]][0].root,'week');
            }

            for (var j = 0; j < weekLength; j++) {
                var b;
                if (dataByDep['Android']) {
                    b = dataByDep['Android'][weeksArr[j].week] ? dataByDep['Android'][weeksArr[j].week][0].revenue : 0;
                } else {
                    b = 0;
                }
                if (maxdata < b)maxdata = b;
                data.push({
                    Revenue: b,
                    week: weeksArr[j].week
                });

                if (dataByDep['iOS']) {
                    b = dataByDep['iOS'][weeksArr[j].week] ? dataByDep['iOS'][weeksArr[j].week][0].revenue : 0;
                } else {
                    b = 0;
                }
                if (maxdata < b)maxdata = b;
                data2.push({
                    Revenue: b,
                    week: weeksArr[j].week
                });

                if (dataByDep['WP']) {
                    b = dataByDep['WP'][weeksArr[j].week] ? dataByDep['WP'][weeksArr[j].week][0].revenue : 0;
                } else {
                    b = 0;
                }
                if (maxdata < b)maxdata = b;
                data3.push({
                    Revenue: b,
                    week: weeksArr[j].week
                });

                if (dataByDep['Web']) {
                    b = dataByDep['Web'][weeksArr[j].week] ? dataByDep['Web'][weeksArr[j].week][0].revenue : 0;
                } else {
                    b = 0;
                }
                if (maxdata < b)maxdata = b;
                data4.push({
                    Revenue: b,
                    week: weeksArr[j].week
                });
            }
            var height = 144;
            var widthChartConteiner = $('.chartContainer').width();
            var width = widthChartConteiner - 150;
            $('#chart').empty();
            var chart = d3.select("#chart")
                .attr("width", width)
                .attr("height", height)
                .append("g")
                .attr("transform", "translate(45,0)");
            var x = d3.scale.ordinal().rangeRoundBands([0, width], 0.3);

            var y = d3.scale.linear().range([height, 0]);
            x.domain(data.map(function (d) {
                return d.week;
            }));
            y.domain([0, maxdata + 0.1 * maxdata]);
            var line = d3.svg.line().x(function (d) {
                return x(d.week) + x.rangeBand() / 2;
            }).y(function (d) {
                return y(d.Revenue);
            });
            var yAxis = d3.svg.axis().scale(y).orient("left").tickFormat(d3.format("d")).ticks(4).tickFormat(d3.format("m"));
            chart.append("g").attr("class", "y axis").call(yAxis);
            chart.select(".y.axis").selectAll(".tick").selectAll("line").attr("x1", 1300);
            chart.select(".y.axis").selectAll(".tick").selectAll("text").text(function (d) {
                d = d.toString();
                return d = d.substring(0, d.length - 3) + " " + d.substring(d.length - 3, d.length);
            });
            chart.append("path")
                .datum(data)
                .attr("class", "line2")
                .attr("transform", "translate(-45,0)")
                .attr("d", line);

            chart.selectAll(".circle2")
                .data(data)
                .enter()
                .append("circle")
                .attr("class", "circle2")
                .attr("transform", "translate(-45,0)")
                .attr("cx", function (d) {
                    return x(d.week) + x.rangeBand() / 2;
                })
                .attr("cy", function (d) {
                    return y(d.Revenue);
                })
                .attr("r", function (d) {
                    return 4;
                })
                .style("stroke-width", "1.2");

            chart.append("path")
                .datum(data2)
                .attr("class", "line3")
                .attr("transform", "translate(-45,0)")
                .attr("d", line);
            chart.selectAll(".circle3")
                .data(data2)
                .enter()
                .append("circle")
                .attr("class", "circle3")
                .attr("transform", "translate(-45,0)")
                .attr("cx", function (d) {
                    return x(d.week) + x.rangeBand() / 2;
                })
                .attr("cy", function (d) {
                    return y(d.Revenue);
                })
                .attr("r", function (d) {
                    return 4;
                })
                .style("stroke-width", "1.2");

            chart.append("path")
                .datum(data3)
                .attr("class", "line4")
                .attr("transform", "translate(-45,0)")
                .attr("d", line);
            chart.selectAll(".circle4")
                .data(data3)
                .enter()
                .append("circle")
                .attr("class", "circle4")
                .attr("transform", "translate(-45,0)")
                .attr("cx", function (d) {
                    return x(d.week) + x.rangeBand() / 2;
                })
                .attr("cy", function (d) {
                    return y(d.Revenue);
                })
                .attr("r", function (d) {
                    return 4;
                })
                .style("stroke-width", "1.2");


            chart.append("path")
                .datum(data4)
                .attr("class", "line5")
                .attr("transform", "translate(-45,0)")
                .attr("d", line);
            chart.selectAll(".circle5")
                .data(data4)
                .enter()
                .append("circle")
                .attr("class", "circle5")
                .attr("transform", "translate(-45,0)")
                .attr("cx", function (d) {
                    return x(d.week) + x.rangeBand() / 2;
                })
                .attr("cy", function (d) {
                    return y(d.Revenue);
                })
                .attr("r", function (d) {
                    return 4;
                })
                .style("stroke-width", "1.2");
        },

        render: function (employees) {
            var self = this;
            var thisEl = this.$el;
            var model = this.model.toJSON();

            this.employees = employees;

            model.employees = employees;

            this.$el.html(this.template(model));

            this.$el.find("#currentStartWeek").spinner({
                min: 0,
                max: 54
            });

            this.$currentStartWeek = thisEl.find('#currentStartWeek');
            this.$revenueBySales = thisEl.find('.revenueBySales');

            this.rendered = true;

            return this;
        }
    });

    return View;
});