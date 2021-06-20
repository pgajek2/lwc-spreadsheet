import { LightningElement, api } from 'lwc';


import getRecordsList from '@salesforce/apex/BulkUpdateController.getRecordsList';

export default class ExcelTableBulkUpdateModal extends LightningElement {
    @api lookupObject;

    queryTerm;
    records = [];
    _selected = [];
    showBulkUpdateModal = false;

    @api showModal() {
        this.showBulkUpdateModal = true;
        this.records = [];
        this._selected = [];
        this.queryTerm = null;
    }
    
    get selected() {
        return this._selected.length ? this._selected : 'none';
    }

    get disabledSave() {
        return this.selected === 'none';
    }

    getRecordsListApex() {
        getRecordsList({
            objectName: this.lookupObject,
            recordName: this.queryTerm
        }).then(result => {
            this.records = result && result.length ? result.map(record => {
                return {
                    label: record.Name,
                    value: record.Id
                }
            }) : [];
        }).catch(error => {
            console.error(error);
        })
    }

    handleCancel() {
        this.showBulkUpdateModal = false;
    }

    handleKeyUp(evt) {
        const isEnterKey = evt.keyCode === 13;
        if (isEnterKey) {
            this.queryTerm = evt.target.value;
            this.getRecordsListApex();
        }
    }

    handleChange(e) {
        this._selected = e.detail.value;
    }

    handleSave() {
        this.dispatchEvent(
            new CustomEvent('bulkupdate', {
                detail: this._selected[0]    
            })
        );
        this.showBulkUpdateModal = false;
    }
}