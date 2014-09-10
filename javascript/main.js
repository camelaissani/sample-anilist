$(document).ready(function() {

    //-----------------------------------------------------------------
    // DATA
    //-----------------------------------------------------------------
    var dataRows = {};
    var arStatus = [{label:"Paid", class:'success'}, {label:"Unpaid", class:'danger'}, {label:"Partially paid", class:'warning'}];
    var arNames = ['Carl Paterson', 'Peter Quinn', 'Peter Grant', 'Christopher Piper', 'Trevor Murray', 'Ian Davies'];
    var arPhones = ['11 111 111', '12 222 111', '23 333 111', '44 111 444', '77 555 111', '11 333 111'];
    var status, name;

    dataRows.rows = [];
    for (var i = 0; i < arNames.length; i++) {
        status = arStatus[Math.floor(Math.random() * arStatus.length)];
        dataRows.rows.push({ 
            _id: String(i),
            title: arNames[i],
            resources: [
                {
                    id: '0',
                    type: 'office',
                    label: 'Office',
                    value: 'Office '+i
                },
                {
                    id: '1',
                    type: 'parking',
                    label: 'Parking',
                    value: 'Parking '+i
                }
            ],
            status: {cssClass: status.class, label: status.label},
            contacts: [
                {
                    id:'0',
                    name: arNames[i],
                    phone: arPhones[i],
                    email: arNames[i].replace(' ','.') + '@gmail.com'
                },
            ],
            comment: 'Any comments\nFor this rent.',
            rent: {
                currency: '€',
                paidAmount: status.class==='success'?1200:status.class==='danger'?0:1000,
                rentAmount: 1200,
                balanceAmount: status.class==='success'?0:status.class==='danger'?-1200:-200
            }
        });
    }

    //-----------------------------------------------------------------
    // List initialisation
    //-----------------------------------------------------------------
    var list = new List('rents-list', dataRows);

    // Manage menu actions
    list.on('list.action.click', function(selection){
        if (selection.actionId==='list-action-pay-rent') {
            list.openForm('pay-rent-form');
        }
        else if (selection.actionId==='list-action-print-others') {
            list.openForm('print-doc-selector');
        }
        else if (selection.actionId==='list-action-save-form') {
            list.closeForm(function() {
                var data = list.getSelectedData()[0];
                var payment = Number($('#rent-payment-input').val());

                data.rent.paidAmount = payment;
                data.rent.balanceAmount = payment - data.rent.rentAmount;
                if (data.rent.balanceAmount >= 0 ) {
                    data.status.cssClass = 'success';
                    data.status.label = 'Paid';
                }
                else if (payment>0) {
                    data.status.cssClass = 'warning';
                    data.status.label = 'Partially paid';
                }
                else {
                    data.status.cssClass = 'danger';
                    data.status.label = 'Unpaid';
                }
                list.update(data);
            });
        }
    });

    // Manage open/close form
    list.on('list.action.openform', function(selection) {
        $('#title-bar').velocity('transition.fadeOut', {display: null});
        $('#rent-payment-input').val(selection.data[0].rent.paidAmount);
    });

    list.on('list.action.closeform', function(selection) {
        $('#title-bar').velocity('transition.fadeIn', {display: null});
    });

    //-----------------------------------------------------------------
    // Filter bar management
    //-----------------------------------------------------------------
    $('#rents-filterbar label').click(function() {
        var $selected = $(this);

        $('#rents-filterbar label').removeClass('active');
        $selected.addClass('active');

        list.filter($selected.find('input').data('value'));

        return false;
    });
});