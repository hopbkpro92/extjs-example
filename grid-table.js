Ext.onReady(function () {

    // Your provided Table data
    var tableData = [
        {
            name: 'James',
            value: ['ro', 'nan', 'do']
        },
        {
            name: 'David',
            value: ['rick', 'ky', 'na']
        },
        {
            name: 'Taylor',
            value: ['man', 'zu', 'kick']
        }
    ];

    // 1. Define the Data Models
    // TableModel remains the same for the left panel grid
    Ext.define('TableModel', {
        extend: 'Ext.data.Model',
        fields: [
            { name: 'name', type: 'string' },
            { name: 'value', type: 'auto', defaultValue: [] } // Default to empty array for new records
        ],
        validations: [{
            type: 'presence',
            field: 'name'
        }]
    });

    // NEW: Define a Model for individual value elements (for the right panel grid)
    Ext.define('ValueItemModel', {
        extend: 'Ext.data.Model',
        fields: [
            { name: 'text', type: 'string' } // Each value string will be stored in a 'text' field
        ],
        validations: [{
            type: 'presence',
            field: 'text' // Value items should not be blank
        }]
    });

    // 2. Create the Data Store (for the left panel grid)
    var tableStore = Ext.create('Ext.data.Store', {
        model: 'TableModel',
        data: tableData,
        proxy: {
            type: 'memory',
            reader: {
                type: 'json'
            }
        },
        sorters: [{
            property: 'name',
            direction: 'ASC'
        }]
    });

    // --- Helper function for filtering the store (for the left panel grid) ---
    var filterStore = function (field, newValue) {
        var store = tableStore;
        if (newValue) {
            store.filter({
                property: 'name',
                value: newValue,
                anyMatch: true,
                caseSensitive: false
            });
        } else {
            store.clearFilter();
        }
    };

    // --- Create Cell Editing Plugins ---
    // 1. For the Name Grid (left panel) - still prevents dblclick editing
    var nameCellEditing = Ext.create('Ext.grid.plugin.CellEditing', {
        clicksToEdit: 0,
        listeners: {
            beforeedit: function (editor, context) {
                // Prevent editing if triggered by a double-click on the name field
                if (context.originalEvent && context.originalEvent.type === 'dblclick' && context.field === 'name') {
                    return false;
                }
                return true;
            }
        }
    });

    // 2. NEW: For the Value Items Grid (right panel) - allows single-click editing
    var valueCellEditing = Ext.create('Ext.grid.plugin.CellEditing', {
        clicksToEdit: 1 // Single click to edit each value item
    });

    // --- Helper function to update the main record's 'value' array from the valueItemsStore ---
    // This is called whenever a value item is added, edited, or deleted in the right panel.
    function updateMainRecordValue(mainRecord, valueItemsStore) {
        var newValuesArray = [];
        valueItemsStore.each(function (valueItemRecord) {
            newValuesArray.push(valueItemRecord.get('text'));
        });
        mainRecord.set('value', newValuesArray);
        console.log('Main record updated: ' + mainRecord.get('name') + ' ->', newValuesArray);
        // Optionally, if the name changes, update the tab title
        var tabPanel = Ext.getCmp('rightTabPanel');
        var tabId = 'editor-tab-' + mainRecord.get('name').toLowerCase().replace(/\s/g, '-');
        var existingTab = tabPanel.down('#' + tabId);
        if (existingTab) {
            existingTab.setTitle(mainRecord.get('name'));
        }
    }

    // --- Helper function to add a new value item to the store ---
    function addValueItem(field, store, mainRecord, valueGrid) {
        var value = field.getValue().trim();
        if (value) {
            var newRec = Ext.create('ValueItemModel', { text: value });
            store.add(newRec);
            field.reset(); // Clear the textfield

            updateMainRecordValue(mainRecord, store); // Auto-save

            // Optional: Auto-select and start editing the newly added item
            if (valueGrid) {
                valueGrid.getSelectionModel().select(newRec);
                var textColumn = valueGrid.headerCt.getHeaderAtIndex(0);
                valueCellEditing.startEdit(newRec, textColumn);
            }
        }
    }


    // 3. Create the Left Panel (Grid)
    var nameGrid = Ext.create('Ext.grid.Panel', {
        region: 'west', // Position on the left in a border layout
        title: 'Names',
        width: 250, // Slightly wider to accommodate buttons
        split: true, // Allow user to resize
        store: tableStore,
        hideHeaders: true, // No need for column headers if only one primary column
        plugins: [nameCellEditing], // Attach the name-specific cell editing plugin
        columns: [
            {
                dataIndex: 'name',
                flex: 1, // Take all available width
                editor: { // Define an editor for this column
                    xtype: 'textfield',
                    allowBlank: false
                }
            },
            {
                xtype: 'actioncolumn',
                width: 50, // Space for the two buttons
                align: 'center',
                items: [
                    {
                        text: '?', // Display '?' text instead of an icon
                        tooltip: 'Rename',
                        cls: 'x-action-col-button',
                        handler: function (grid, rowIndex, colIndex, item, e, record) {
                            var nameColumn = grid.headerCt.getHeaderAtIndex(0);
                            nameCellEditing.startEdit(record, nameColumn); // Explicitly start edit
                        }
                    },
                    {
                        text: 'x', // Display 'x' text instead of an icon
                        tooltip: 'Delete',
                        cls: 'x-action-col-button',
                        handler: function (grid, rowIndex, colIndex, item, e, record) {
                            Ext.Msg.confirm(
                                'Confirm Delete',
                                'Are you sure you want to delete "' + record.get('name') + '"?',
                                function (btn) {
                                    if (btn === 'yes') {
                                        tableStore.remove(record);

                                        // Close any open editor tab for this record
                                        var tabPanel = Ext.getCmp('rightTabPanel');
                                        // Note: tabId might need to be dynamic if name was changed
                                        // A more robust way might be to iterate tabs and check tab.record === record
                                        var tabId = 'editor-tab-' + record.get('name').toLowerCase().replace(/\s/g, '-');
                                        var existingTab = tabPanel.down('#' + tabId);
                                        if (existingTab) {
                                            tabPanel.remove(existingTab, true); // true to destroy the component
                                        }
                                    }
                                }
                            );
                        }
                    }
                ]
            }
        ],
        tbar: [ // Top toolbar for filter and add button
            {
                xtype: 'textfield',
                itemId: 'nameFilterField',
                emptyText: 'Filter names...',
                flex: 1,
                listeners: {
                    change: {
                        fn: filterStore,
                        buffer: 300
                    }
                }
            },
            {
                xtype: 'button',
                text: '+',
                tooltip: 'Add new name',
                handler: function () {
                    var newRecord = Ext.create('TableModel', {
                        name: 'New Item', // Default name
                        value: []
                    });
                    tableStore.add(newRecord);
                    tableStore.sort(); // Re-sort to place new item correctly if sorted

                    nameGrid.getSelectionModel().select(newRecord);
                    var nameColumn = nameGrid.headerCt.getHeaderAtIndex(0);
                    nameCellEditing.startEdit(newRecord, nameColumn); // Explicitly start edit for new item
                }
            }
        ],
        // Listen for double click event on a row
        listeners: {
            itemdblclick: function (view, record, item, index, e, eOpts) {
                e.stopEvent(); // Stop event propagation to prevent other handlers (like native browser dblclick)

                var tabPanel = Ext.getCmp('rightTabPanel');
                var recordName = record.get('name');
                var tabId = 'editor-tab-' + recordName.toLowerCase().replace(/\s/g, '-');

                // Check if a tab for this record is already open
                var existingTab = tabPanel.down('#' + tabId);

                if (!existingTab) {
                    // Create a new store for the value items of THIS record
                    var valueItemsStore = Ext.create('Ext.data.Store', {
                        model: 'ValueItemModel',
                        // Map the simple string array from the main record to objects for the ValueItemModel
                        data: record.get('value').map(v => ({ text: v })),
                        proxy: {
                            type: 'memory',
                            reader: {
                                type: 'json'
                            }
                        }
                    });

                    existingTab = tabPanel.add({
                        itemId: tabId, // Set itemId for easy lookup
                        title: recordName,
                        closable: true, // Allow closing the tab
                        layout: 'fit', // Make the grid fill the tab content area
                        record: record, // Store a reference to the main record on the tab
                        items: [{
                            xtype: 'gridpanel',
                            store: valueItemsStore, // Use the dynamically created store
                            hideHeaders: true, // No need for column headers
                            plugins: [Ext.create('Ext.grid.plugin.CellEditing', {
                                clicksToEdit: 1
                            })], // Attach the value-specific cell editing plugin
                            columns: [
                                {
                                    dataIndex: 'text',
                                    flex: 1, // Take all available width
                                    editor: { // Editor for renaming value items
                                        xtype: 'textfield',
                                        allowBlank: false
                                    }
                                },
                                {
                                    xtype: 'actioncolumn',
                                    width: 30, // Smaller width for single 'x' button
                                    align: 'center',
                                    items: [
                                        {
                                            text: 'x', // Delete button for value item
                                            tooltip: 'Delete value',
                                            cls: 'x-action-col-button', // Re-use blue styling
                                            handler: function (grid, rowIndex, colIndex, item, e, valueRecord) {
                                                // valueRecord is the ValueItemModel instance
                                                Ext.Msg.confirm(
                                                    'Confirm Delete',
                                                    'Are you sure you want to delete "' + valueRecord.get('text') + '"?',
                                                    function (btn) {
                                                        if (btn === 'yes') {
                                                            valueItemsStore.remove(valueRecord);
                                                            // Auto-save the changes back to the main record immediately
                                                            updateMainRecordValue(record, valueItemsStore);
                                                        }
                                                    }
                                                );
                                            }
                                        }
                                    ]
                                }
                            ],
                            tbar: [ // Toolbar for adding new value items
                                {
                                    xtype: 'textfield',
                                    itemId: 'newValueItemField',
                                    emptyText: 'New value...',
                                    flex: 1,
                                    listeners: {
                                        specialkey: function (field, e) {
                                            if (e.getKey() === e.ENTER) {
                                                addValueItem(field, valueItemsStore, record, field.up('gridpanel'));
                                            }
                                        }
                                    }
                                },
                                {
                                    xtype: 'button',
                                    text: 'Add',
                                    tooltip: 'Add new value item',
                                    handler: function (button) {
                                        var field = button.prev(); // Get the textfield
                                        addValueItem(field, valueItemsStore, record, field.up('gridpanel'));
                                    }
                                }
                            ],
                            // Listener for when a value item is edited/committed
                            listeners: {
                                edit: function (editor, context) {
                                    // This fires when a cell edit is complete (e.g., user presses Enter or clicks away)
                                    updateMainRecordValue(record, valueItemsStore); // Auto-save
                                }
                            }
                        }],
                        // Optional: Keep a manual save button, otherwise rely on auto-save
                        buttons: [{
                            text: 'Sync Values',
                            tooltip: 'Manually synchronize values with the main record',
                            handler: function (button) {
                                var currentTab = button.up('panel');
                                var associatedRecord = currentTab.record;
                                var valueGrid = currentTab.down('gridpanel');
                                if (valueGrid) {
                                    updateMainRecordValue(associatedRecord, valueGrid.getStore());
                                    Ext.Msg.alert('Success', '"' + associatedRecord.get('name') + '" values synchronized!');
                                }
                            }
                        }]
                    });
                }
                tabPanel.setActiveTab(existingTab); // Activate (show) the tab
            }
        }
    });

    // 4. Create the Right Panel (Tab Panel)
    var rightTabPanel = Ext.create('Ext.tab.Panel', {
        id: 'rightTabPanel', // Use 'id' for easy global lookup with Ext.getCmp()
        region: 'center', // Takes the remaining space in the border layout
        title: 'Value Editors',
        activeTab: 0, // Set the initial active tab if any default tabs exist
        items: [{
            title: 'Welcome',
            html: '<div style="padding:10px; font-size: 14px;">Double click a name on the left to open its editor.</div>',
            bodyPadding: 10,
            closable: false // This welcome tab shouldn't be closable
        }]
    });

    // 5. Create the Window
    Ext.create('Ext.window.Window', {
        title: 'Table Data Editor',
        width: 900,
        height: 500,
        layout: 'border', // Essential for left/right panel arrangement
        closable: true,
        maximizable: true,
        items: [
            nameGrid,         // Left panel
            rightTabPanel     // Right panel
        ]
    }).show();

});