Ext.onReady(function() {
    // Define the data model.
    Ext.define('UserModel', {
        extend: 'Ext.data.Model',
        fields: ['name', 'value']
    });

    // Create a sample store.
    let store = Ext.create('Ext.data.Store', {
        model: 'UserModel',
        data: [
            { name: 'Item 1', value: 'Initial text\nwith line breaks' },
            { name: 'Item 2', value: 'Another text value\nappearing on two lines' }
        ]
    });

    // Create a CellEditing plugin instance with a custom beforeedit listener.
    let cellEditing = Ext.create('Ext.grid.plugin.CellEditing', {
        clicksToEdit: 1,
        listeners: {
            beforeedit: function(editor, e) {
                // Apply only for the "value" column.
                if (e.column.dataIndex === 'value') {
                    // Get the cell element that is currently rendered (non-editor state).
                    let cellEl = e.grid.getView().getCell(e.record, e.column);
                    if (cellEl) {
                        // Measure the current cell height.
                        let cellHeight = Ext.fly(cellEl).getHeight();
                        let textArea = e.column.getEditor();

                        // Set the minimum grow height to the measured cell height.
                        textArea.growMin = cellHeight;

                        // Force the editor to adopt that height once rendered.
                        if (textArea.rendered) {
                            textArea.setHeight(cellHeight);
                        } else {
                            textArea.on('afterrender', function() {
                                textArea.setHeight(cellHeight);
                                // Ensure a proper layout so the new height takes effect.
                                textArea.doComponentLayout();
                            }, null, { single: true });
                        }
                    }
                }
            }
        }
    });

    // Create the grid panel.
    let grid = Ext.create('Ext.grid.Panel', {
        renderTo: Ext.getBody(),
        store: store,
        width: 600,
        height: 300,
        title: 'Editable Grid with Auto–Growing Textarea',
        plugins: [cellEditing],
        columns: [
            {
                header: 'Name',
                dataIndex: 'name',
                flex: 1,
                editor: {
                    xtype: 'textfield',
                    allowBlank: false
                }
            },
            {
                header: 'Value',
                dataIndex: 'value',
                flex: 2,
                renderer: function(value) {
                    // Render newlines properly by converting them to <br/>.
                    return Ext.isEmpty(value)
                        ? value
                        : Ext.String.htmlEncode(value).replace(/\n/g, '<br/>');
                },
                editor: {
                    xtype: 'textarea',
                    grow: true,       // Enable auto–growing.
                    // Default grow parameters (growMin will be overwritten by our measured cell height)
                    growMin: 40,
                    growMax: 300,
                    allowBlank: false
                }
            }
        ]
    });
});