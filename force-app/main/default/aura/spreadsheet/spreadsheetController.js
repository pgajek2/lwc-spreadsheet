({
    doInit : function(component, event, helper) {
        console.log(component.get("v.recordId"));

        window.addEventListener('keydown', (e) => {
            component.find('fieldsetDatatable').changeCell(e);
        });
    }
})
