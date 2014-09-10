var List = (function(Handlebars, Events, $){
    // -----------------------------------------------------------------------
    // PRIVATE ATTRIBUTES
    // -----------------------------------------------------------------------
    var EVENT_TYPE_ACTION = 'list.action.click';
    var EVENT_TYPE_OPENFORM = 'list.action.openform';
    var EVENT_TYPE_CLOSEFORM = 'list.action.closeform';
    var TRANSITION_NABAR_DURATION = 200;
    var TRANSITION_ROW_DURATION = 300;
    var TRANSITION_MAXROW = 10;

    // -----------------------------------------------------------------------
    // CONSTRUCTOR
    // -----------------------------------------------------------------------
    function List(listId, dataRows) {
        var self = this;
        var htmlRows;

        // Use minivents
        Events(this);

        //Handlebars helpers
        // TODO: check that it is not already registered
        Handlebars.registerHelper('breaklines', function(text) {
            text = Handlebars.Utils.escapeExpression(text);
            text = text.replace(/(\r\n|\n|\r)/gm, '<br>');
            return new Handlebars.SafeString(text);
        });

        Handlebars.registerHelper('commentVisible', function(text) {
            if (!text || text.length ===0) {
                return new Handlebars.SafeString("display: none;");
            }
            return "";
        });

        // attributes
        this.listId = listId;

        // find elements in dom
        this.bindDom();

        // Handlebars templates
        this.sourceTemplateRow = this.$list.find('#list-row-template').html();
        Handlebars.registerPartial("list-row-template", this.sourceTemplateRow);
        this.templateRowsContainer = Handlebars.compile(this.$list.find('#list-content-template').html());

        // row management
        $(document).on('click', '#'+this.listId+' .list-row', function(event) {
            self.select($(this));
            return false;
        });
        // action management
         $(document).on('click', '#'+this.listId+' .list-action', function(event) {
            var $action = $(this);
            var actionId = $action.attr('id');

            // here manage cancel selection (internal action)
            if ($(this).hasClass('cancel-selection')) {
                self.unselectAll();
                return false;
            }

            // here manage cancel on form (internal action)
            if ($(this).hasClass('cancel-form')) {
                self.closeForm();
                return false;
            }
            if ($action.hasClass('disabled') ||
                ($action.hasClass('only-mono-selection') && self.getSelection().length>1)) {
                return false;
            }

            self.emit(EVENT_TYPE_ACTION, {actionId: actionId, data: self.getSelectedData()});

            return false;
        });

        this.init(dataRows);
    }

    // -----------------------------------------------------------------------
    // PRIVATE METHODS
    // -----------------------------------------------------------------------
    function _cloneObject(obj) {
        var clone = {};
        for(var i in obj) {
            if(typeof(obj[i])=="object" && obj[i] !== null) {
                clone[i] = _cloneObject(obj[i]);
            }
            else {
                clone[i] = obj[i];
            }
        }
        return clone;
    }

    function _ref(obj, str) {
        str = str.split(".");
        for (var i = 0; i < str.length; i++) {
            obj = obj[str[i]];
        }
        return obj;
    }

    function _set(obj, str, val) {
        str = str.split(".");
        while (str.length > 1) {
            obj = obj[str.shift()];
        }
        obj[str.shift()] = val;
    }

    function _animateValue($element, start, end, duration) {
        var nbLoop = 20;
        var range = end - start;
        var current = start;
        var stepTime = duration / nbLoop;
        var increment = range / nbLoop;
        var timer;

        if (range === 0) {
            return;
        }
        timer = setInterval(function() {
            current += increment;
            if ((range>0 && current >= end) || 
                (range<0 && current <= end)) {
                // TODO: manage number format
                $element.html(end.toFixed(2));
                clearInterval(timer);
            }
            else {
                // TODO: manage number format
                $element.html(current.toFixed(2));
            }
        }, stepTime);
    }

    // -----------------------------------------------------------------------
    // PUBLIC METHODS
    // -----------------------------------------------------------------------
    List.prototype.bindDom = function() {
        this.$list = $('#'+this.listId);
        this.$navbar = this.$list.find('.list-navbar');
        this.$actions = this.$list.find('.list-action');
        this.$monoSelectionActions = this.$navbar.find('.list-action.only-mono-selection');
        this.$forms = this.$list.find('.list-form .list-form-view');
        this.$rowsContainer = this.$list.find('.list-content');
    };

    // -----------------------------------------------------------------------
    // MAIN NAVBAR MANAGEMENT
    // -----------------------------------------------------------------------
    List.prototype.showHideNavBar = function(show) {
        if (show) {
            if (this.$navbar.css('opacity')==0) {
                this.$navbar.velocity('transition.slideDownIn', {duration: TRANSITION_NABAR_DURATION});
            }   
        }
        else {
            if (this.$navbar.css('opacity')>0) {
                this.$navbar.velocity('transition.slideUpOut', {duration: TRANSITION_NABAR_DURATION});
            }
        }
    };

    // -----------------------------------------------------------------------
    // ROW MANAGEMENT
    // -----------------------------------------------------------------------
    List.prototype.unselectAll = function() {
        this.$list.find('.list-row').removeClass('active');
        this.showHideNavBar(false);
    };

    List.prototype.select = function($selectedRow) {
        var $entireSelectedRows;
        if ($selectedRow.hasClass('fixed')) {
            return;
        }
        if ($selectedRow.hasClass('active')) {
            $selectedRow.removeClass('active');
        }
        else {
            $selectedRow.addClass('active');
        }

        $entireSelectedRows = this.getSelection();
        if ($entireSelectedRows.length !== 0) {
            if ($entireSelectedRows.length>1) {
                this.$monoSelectionActions.addClass('disabled');
            }
            else {
                this.$monoSelectionActions.removeClass('disabled');   
            }
            this.showHideNavBar(true);
        }
        else {
            this.showHideNavBar(false);
        }
    };

    List.prototype.getSelection = function() {
        return this.$list.find('.list-row.active');
    };

    List.prototype.update = function(newDataRow) {
        var self = this;
        var templateRow;
        var htmlRow;
        var newDataRowWithoutOdometerValues = _cloneObject(newDataRow);
        var oldDataRow;
        var $oldRow;
        var $newRow;
        var dataRowIndex;
        var active, fixed;

        
        // Find old data
        for (var i=0; i<this.dataRows.rows.length; ++i) {
            if (this.dataRows.rows[i]._id === newDataRow._id) {
                dataRowIndex = i;
                oldDataRow = this.dataRows.rows[i];
                break;
            }
        }
        
        $oldRow= this.$list.find('#'+newDataRow._id+'.list-row');
        $oldRow.find('.odometer').each(function() {
            var key = $(this).attr('id');
            _set(newDataRowWithoutOdometerValues, key, _ref(oldDataRow, key));
        });

        templateRow = Handlebars.compile(this.sourceTemplateRow);
        htmlRow = templateRow(newDataRowWithoutOdometerValues);

        active = $oldRow.hasClass('active');
        fixed = $oldRow.hasClass('fixed');

        $oldRow.replaceWith(htmlRow);
        
        $newRow = this.$list.find('#'+newDataRow._id+'.list-row');
        if (active) {
            $newRow.addClass('active');
        }
        if (fixed) {
            $newRow.addClass('fixed');
        }
        $newRow.find("[data-toggle=tooltip]").tooltip();
        $newRow.show();

        // Play odometers
        $newRow.find('.odometer').each(function() {
            var $odometer = $(this);
            var key = $odometer.attr('id');
            _animateValue($odometer, _ref(oldDataRow, key), _ref(newDataRow, key), 1000);
        });

        // update data
        this.dataRows.rows[dataRowIndex] = newDataRow;
    };

    List.prototype.remove = function(dataRow, noAnimation) {
        var $rowToRemove = this.$list.find('#'+dataRow._id+'.list-row');

        // Find data in array and remove it
        for (var i=0; i<this.dataRows.rows.length; ++i) {
            if (this.dataRows.rows[i]._id === dataRow._id) {
                this.dataRows.rows.splice(i, 1);
                break;
            }
        }

        // Animate remove
        if (!noAnimation) {
            $rowToRemove.velocity('transition.swoopOut', {complete: function() {
                // Remove row from DOM
                $rowToRemove.remove();
            }});
        }
        else {
            $rowToRemove.remove();
        }
    };

    List.prototype.add = function(dataRow, noAnimation) {
        var templateRow = Handlebars.compile(this.sourceTemplateRow);
        var htmlRow = templateRow(dataRow);
        var $newRow;

        // Add data in array
        this.dataRows.rows.push(dataRow);

        // Add row in DOM
        this.$rowsContainer.append(htmlRow);
        $newRow = this.$list.find('#'+dataRow._id+'.list-row');

        // Animate add
        $newRow.find("[data-toggle=tooltip]").tooltip();
        if (!noAnimation) {
            $newRow.velocity('transition.swoopIn');
        }
        else {
            $newRow.show();
        }
    };

    List.prototype.init = function(dataRows, noAnimation) {
         // Add initial rows
        if (!dataRows) {
            this.dataRows = {rows:[]};
        }
        else {
            this.dataRows = dataRows;
        }
        if (this.dataRows) {
            htmlRows = this.templateRowsContainer(this.dataRows);
            this.$rowsContainer.html(htmlRows); 
        }

        // Tooltip management
        this.$rowsContainer.find("[data-toggle=tooltip]").tooltip();

        // Animate layout
        if (!noAnimation) {
            _animateShowRows(this.$rowsContainer.find('.list-row'), 'transition.swoopIn');
            //.velocity('transition.swoopIn', {display:'table', stagger: 150});
        }
        else {
            this.$rowsContainer.find('.list-row').show();
        }
    };

    List.prototype.filter = function(text, noAnimation) {
        var $allRows;
        var $rowsToFilter;
        var $rowsToShow;
        var $rowsToHide;

        this.unselectAll();

        // remove filter on all rows
        $allRows = this.$list.find('.list-row');
        $allRows.removeClass('list-element-filtered');
        
        // hide rows that not match filter
        if (text && text.length!==0) {
            $rowsToFilter = $allRows.find('.list-value').filter(':contains("'+text+'")').closest('.list-row');
            $rowsToFilter.addClass('list-element-filtered');
        
            if (!noAnimation) {
                $rowsToHide = $allRows.not('.list-element-filtered').not(':hidden');
                $rowsToShow = $rowsToFilter.not(':visible');

                _animateHideRows($rowsToHide, 'transition.bounceRightOut', function() {
                    _animateShowRows($rowsToShow, 'transition.bounceRightIn');
                });
            }
            else {
                $allRows.hide();
                $rowsToFilter.show();
            }
        }
        else {
            if (!noAnimation) {
                $rowsToShow = $allRows.not(':visible');
                _animateShowRows($rowsToShow, 'transition.bounceRightIn');
            }
            else {
                $allRows.show();
            }
        }
    };

    // -----------------------------------------------------------------------
    // FORM MANAGEMENT
    // -----------------------------------------------------------------------
    function _animateHideRows($rows, transition, callback) {
        if ($rows.length > TRANSITION_MAXROW) {
            $rows.slice(TRANSITION_MAXROW, $rows.length).hide();
            $rows.slice(0, TRANSITION_MAXROW).velocity(transition, {duration: TRANSITION_ROW_DURATION, stagger: 150, complete: function(){
                if (callback) {
                    callback();
                }
            }});
        }
        else {
            if ($rows.length>0) {
                $rows.velocity('transition.bounceRightOut', {duration: TRANSITION_ROW_DURATION, stagger: 150, complete: function(){
                    if (callback) {
                        callback();
                    }
                }});
            }
            else {
                if (callback) {
                    callback();
                }
            }
        }
    }
    function _animateShowRows($rows, transition, callback) {
        if ($rows.length > TRANSITION_MAXROW) {
            $rows.slice(0, TRANSITION_MAXROW).velocity(transition, {display: 'table', duration: TRANSITION_ROW_DURATION, stagger: 150, complete: function(){
                $rows.slice(TRANSITION_MAXROW, $rows.length).css('opacity', 1).show();
                if (callback) {
                    callback();
                }
            }});
        }
        else {
            if ($rows.length>0) {
                 $rows.velocity('transition.bounceRightIn', {display: 'table', duration: TRANSITION_ROW_DURATION, stagger: 150, complete: function(){
                    if (callback) {
                        callback();
                    }
                }});
             }
            else {
                if (callback) {
                    callback();
                }
            }
        }
    }
    List.prototype.showHideFormNavBar = function(formId, show) {
        var $formNavBar;

        if (show) {
            $formNavBar = this.$list.find('#'+formId +'.list-form .list-form-navbar');
            $formNavBar.addClass('active');
            $formNavBar.velocity('transition.slideDownIn', {duration: TRANSITION_NABAR_DURATION});
                
        }
        else {
            $formNavBar = this.$list.find('.list-form .list-form-navbar');
            $formNavBar.removeClass('active');
            $formNavBar.velocity('transition.slideDownOut', {duration: TRANSITION_NABAR_DURATION});
        }
    };

    List.prototype.openForm = function(formId) {
        var self = this;
        var $rowsToHide = this.$list.find('.list-row');
        var $rowsToShow = this.getSelection();
                
        this.showHideNavBar(false);
       
        this.emit(EVENT_TYPE_OPENFORM, {formId: formId, data: this.getSelectedData()});

        _animateHideRows($rowsToHide, 'transition.bounceRightOut', function() {
            self.showHideFormNavBar(formId, true);
            $rowsToShow.addClass('fixed');
            $('#'+formId +'.list-form .list-form-view').velocity('transition.bounceRightIn', {complete:function() {
                self.$list.find('.list-content-selection-label').velocity('transition.bounceRightIn');
                _animateShowRows($rowsToShow, 'transition.bounceRightIn');
            }});    
        }); 
    };

    List.prototype.closeForm = function(callback) {
        var self = this;
        var $rowsToHide = this.$list.find('.list-row.fixed');
        var $rowsToShow;
        var $rowsFiltered = this.$list.find('.list-row.list-element-filtered');
        if ($rowsFiltered.length>0) {
            $rowsToShow = $rowsFiltered;
        } 
        else {
            $rowsToShow = this.$list.find('.list-row');  
        }

        this.$list.find('.list-content-selection-label').velocity('transition.bounceRightOut');
        //$rowsToHide.velocity('transition.bounceRightOut', {stagger: 150, complete: function() {
        _animateHideRows($rowsToHide, 'transition.bounceRightOut', function() {
            self.showHideFormNavBar(null, false);
            self.$forms.velocity('transition.bounceRightOut', {complete:function() {
                self.showHideNavBar(true);
                //$rowsToShow.velocity('transition.bounceRightIn', {display:'table', stagger: 150, complete: function() {
                $rowsToHide.removeClass('fixed');
                self.emit(EVENT_TYPE_CLOSEFORM);
                _animateShowRows($rowsToShow, 'transition.bounceRightIn', function() {
                    //self.$list.find('.list-row.active').velocity("scroll", { duration: 1000, easing: "spring" }) ;
                    if (callback) {
                        callback();
                    }
                });
            }});    
        });
    };

    // -----------------------------------------------------------------------
    // DATA ACCESS
    // -----------------------------------------------------------------------
    List.prototype.getSelectedData = function() {
        var self = this;
        var data = [];

        //TODO: to optimize
        this.getSelection().each(function() {
            var id = $(this).attr('id');
            for (var i = 0; i < self.dataRows.rows.length; i++) {
                if (self.dataRows.rows[i]._id === id) {
                    data.push(_cloneObject(self.dataRows.rows[i]));
                    break;
                }
            }
        });
        return data;
    };

    return List;
})(Handlebars, Events, jQuery);