define([
    'Backbone',
    'jQuery',
    'Underscore',
    'text!templates/Product/ContentTemplate.html',
    'models/Category',
    'views/Products/category/CreateView',
    'views/Products/category/EditView',
    'collections/Products/filterCollection',
    'views/Products/thumbnails/ThumbnailsView',
    'helpers/eventsBinder',
    'dataService',
    'constants'
], function (Backbone, $, _, ContentTemplate, CurrentModel, CreateCategoryView, EditCategoryView, ProductsCollection, ThumbnailsView, eventsBinder, dataService, CONSTANTS) {
    var ProductsView = Backbone.View.extend({
        el                : '#content-holder',
        thumbnailsView    : null,
        productCollection : null,
        selectedCategoryId: null,

        events: {
            'click .expand'        : 'expandHideItem',
            'click .item > span'   : 'selectCategory',
            'click .editCategory'  : 'editItem',
            'click .deleteCategory': 'deleteItem',
            'click .addProduct'    : 'addProduct'
        },

        initialize: function (options) {
            var eventChannel = {};

            _.extend(eventChannel, Backbone.Events);

            this.startTime = options.startTime;
            this.collection = options.collection;
            this.eventChannel = eventChannel;
            this.collection.bind('reset', _.bind(this.render, this));
            this.startNumber = 0;
            this.filter = options.filter;
            this.countPerPage = options.countPerPage;
            this.productCollection = new ProductsCollection({
                page       : 1,
                contentType: 'Products',
                viewType   : 'thumbnails',
                filter     : this.filter,
                count      : this.countPerPage,
                reset      : true,
                showMore   : false
            });

            this.render();

            this.productCollection.bind('reset', _.bind(this.renderThumbnails, this));
            this.listenTo(eventChannel, 'itemCreated', this.renderFilteredContent);
        },

        addProduct: function (e) {
            e.preventDefault();
            this.thumbnailsView.createItem();
        },

        expandHideItem: function (e) {
            var $target = $(e.target);
            var $ulEl = $target.closest('li').find('ul');

            if ($target.text() === '+') {
                $ulEl.first().removeClass('hidden');
                $ulEl.closest('li').find('.expand').first().text('-');
            } else {
                $ulEl.addClass('hidden');
                $ulEl.closest('li').find('.expand').text('+');
            }

        },

        renderFilteredContent: function (categoryId) {
            var self = this;
            var categoryUrl = '/category/posterity/' + categoryId;

            dataService.getData(categoryUrl, {}, function (ids) {

                if (!App.filtersObject.filter) {
                    App.filtersObject.filter = {};
                }

                App.filtersObject.filter.productCategory = {
                    key  : 'accounting.category._id',
                    value: ids,
                    type : this.filterType || null
                };

                self.thumbnailsView.showFilteredPage(App.filtersObject.filter);

            }, this);
        },

        selectCategory: function (e) {
            var $targetEl = $(e.target);
            var $thisEl = this.$el;
            var $groupList = $thisEl.find('.groupList');
            var $currentLi;
            var id;

            $groupList.find('.selected').removeClass('selected');
            $targetEl.closest('li').addClass('selected');

            $currentLi = $targetEl.closest('li');
            id = $currentLi.attr('data-id');

            this.renderFilteredContent(id);
        },

        createItem: function () {
            var $thisEl = this.$el;
            var $groupList = $thisEl.find('.groupList');
            var $selectedEl = $groupList.find('.selected').length ? $groupList.find('.selected') : $groupList.find('li').first();
            var categoryId = $selectedEl.attr('data-id');

            new CreateCategoryView({
                _id: categoryId
            });
        },

        editItem: function (e) {
            var model = new CurrentModel({validate: false});
            var id = $(e.target).closest('li').data('id');

            model.urlRoot = '/category/' + id;
            model.fetch({
                success: function (model) {
                    new EditCategoryView({myModel: model});
                },

                error: function () {
                    App.render({
                        type   : 'error',
                        message: 'Please refresh browser'
                    });
                }
            });

            return false;
        },

        deleteItem: function (e) {
            var $targetEl = $(e.target);
            var myModel = this.collection.get($targetEl.closest('li').data('id'));
            var mid = 39;
            var self = this;
            var answer = confirm('Really DELETE items ?!');

            e.preventDefault();

            if (answer === true) {
                myModel.destroy({
                    headers: {
                        mid: mid
                    },
                    wait   : true,
                    success: function () {
                        Backbone.history.navigate('easyErp/Products', {trigger: true})
                    },

                    error: function (model, err) {
                        if (err.status === 403) {
                            App.render({
                                type   : 'error',
                                message: 'You do not have permission to perform this action'
                            });
                        } else {
                            Backbone.history.navigate('home', {trigger: true});
                        }
                    }
                });
            }
            return false;
        },

        renderItem: function (product, index, className, selected) {
            return '<li class="' + className + ' item ' + selected + '" data-id="' + product._id + '"data-name="' + product.name + '" data-level="' + product.nestingLevel + '" data-sequence="' + product.sequence + '"><span class="content"><span class="text">' + product.name + '</span><span class="editCategory">&nbspe&nbsp</span><span class="deleteCategory">&nbspd&nbsp</span></span></li>';
        },

        renderFoldersTree: function (products) {
            var self = this;
            var $thisEl = this.$el;
            var par;

            products.forEach(function (product, i) {

                if (!product.parent) {
                    $thisEl.find('.groupList').append(self.renderItem(product, i + 1, 'child', 'selected'));
                } else {
                    par = $thisEl.find("[data-id='" + product.parent._id + "']").removeClass('child').addClass('parent');

                    if (!par.find('.expand').length) {
                        par.append('<a class="expand" href="javascript:;" style="display: inline-block; float: left">-</a>')
                    }

                    if (par.find('ul').length === 0) {
                        par.append('<ul style="margin-left:20px"></ul>');
                    }

                    par.find('ul').first().append(self.renderItem(product, i + 1, 'child'));
                }

            });

            $('.groupList .item').droppable({
                accept: '.product',
                drop  : function (event, ui) {
                    var $droppable = $(this);
                    var $draggable = ui.draggable;
                    var productId = $draggable.attr('id');
                    var categoryId = $droppable.data('id');
                    var categoryName = $droppable.data('name');
                    var update = {
                        category: {
                            _id : categoryId,
                            name: categoryName
                        }
                    };
                    var changed;
                    var currentModel = self.productCollection.get(productId);


                    if (!currentModel) {
                        currentModel = new CurrentModel({validate: false});

                        currentModel.urlRoot = CONSTANTS.URLS.PRODUCT;

                        currentModel.fetch({
                            data   : {id: productId, viewType: 'form'},
                            success: function (response) {
                                currentModel.set({
                                    accounting: update
                                });

                                changed = currentModel.changed;

                                currentModel.save(changed, {
                                    patch  : true,
                                    wait   : true,
                                    success: function () {
                                        self.renderFilteredContent(categoryId);
                                    }
                                });

                                $(this).addClass('selected');
                            },

                            error: function () {
                                App.render({
                                    type   : 'error',
                                    message: 'Please refresh browser'
                                });
                            }
                        });
                    } else {
                        currentModel.set({
                            accounting: update
                        });

                        changed = currentModel.changed;

                        currentModel.save(changed, {
                            patch  : true,
                            wait   : true,
                            success: function () {
                                self.renderFilteredContent(categoryId);
                            }
                        });

                        $(this).addClass('selected');
                    }
                },

                over: function (event, ui) {
                    // remove $.css
                    $(this).css('background-color', 'gray');
                    $(this).addClass('selected');
                },

                out: function () {
                    $(this).css('background-color', '#fff');
                    $(this).addClass('selected');
                }
            });
        },

        renderThumbnails: function () {

            this.thumbnailsView = new ThumbnailsView({
                collection  : this.productCollection,
                startTime   : new Date(),
                filter      : this.filter,
                el          : '#productsHolder',
                eventChannel: this.eventChannel
            });

            this.productCollection.unbind('reset');

            eventsBinder.subscribeCollectionEvents(this.productCollection, this.thumbnailsView);

            this.productCollection.trigger('fetchFinished', {
                totalRecords: this.productCollection.totalRecords,
                currentPage : this.productCollection.currentPage,
                pageSize    : this.productCollection.pageSize
            });
        },

        render: function () {
            var products = this.collection.toJSON();
            this.$el.html(_.template(ContentTemplate));
            this.renderFoldersTree(products);
        }
    });

    return ProductsView;
});
