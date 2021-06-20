import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getRecords from '@salesforce/apex/UniversalDataProvider.getRecords';
import saveRecords from '@salesforce/apex/UniversalDataProvider.saveRecords';
import getColumns from '@salesforce/apex/UniversalDataProvider.getColumns';

export default class FieldsetDatatable extends LightningElement {

    @api recordId; //current page recordId, parentId
    @api parentRecordFieldApi;
    @api objectName;
    @api fieldSetName;
    @api showRowNumberColumn;
    @api lookupObject;

    isLoading = false;
    bulkLookupUpdateConfig = {};
    disableBulkUpdateButton = true;
    lookupRecords = [];

    columns = [];
    data = [];

    async connectedCallback() {
        this.showSpinner();
        await this.getColumnsForObject();
        await this.getRecordsForObject();
    }

    async getRecordsForObject() {
        this.showSpinner();
        
        await getRecords({
            parentId: this.recordId,
            parentFiledApi: this.parentRecordFieldApi,
            objectName: this.objectName,
            fieldSetName: this.fieldSetName
        }).then(result => {
            this.data = result;
        }).catch(error => {
            console.error(error);
        }).finally(() => {
            this.hideSpinner();
        });
    }

    getColumnsForObject() {
        this.showSpinner();

        getColumns({
            objectName: this.objectName,
            fieldSetName: this.fieldSetName
        }).then(result => {
            this.columns = result;
        }).catch(error => {
            console.error(error);
        }).finally(() => {
            this.hideSpinner();
        });
    }

    saveUpdatedData(records, withRefresh) {
        this.showSpinner();
        
        saveRecords({
            records
        }).then(result => {
            this.showSuccessToast();
            if (withRefresh) {
                this.getRecordsForObject();
            }
        }).catch(error => {
            this.showErrorToast(error);
            console.error(error);
        }).finally(() => {
            this.hideSpinner();
        });
    }

    @api
    changeCell(e) {
        this.template.querySelector('c-excel-table').handleCellChange(e);
    }

    transformUpdatedData(updatedData) {
        return updatedData.map(record => {
            let fields = record.fields.reduce((accumulator, field) => {
                return {
                    ...accumulator,
                    [field.fieldName]: field.value
                }
            }, '');
            return {
               Id: record.recordId, 
               ...fields 
            }
        });
    }

    showSuccessToast() {
        this.showNotification('Success', 'Records successfully updated', 'success');
    }

    showErrorToast(error) {
        this.showNotification('Error', `Unexpected Error: ${error}`, 'error');
    }

    showNotification(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title,
                message,
                variant
            })
        );
    }

    showSpinner() {
        this.isLoading = true;
    }

    hideSpinner() {
        this.isLoading = false;
    }

    handleBulkUpdateModal() {
        this.template.querySelector('c-excel-table-bulk-update-modal').showModal();
    }

    handleSave() {
        this.saveUpdatedData(
            this.template.querySelector('c-excel-table').getEditedData(),
            false
        );
    }

    handleReset() {
        this.getRecordsForObject();
    }

    handleBulkUpdate(e) {
        const recordsToUpdate = this.bulkLookupUpdateConfig.recordsToBulkUpdate.map(record => {
            return {
                Id: record,
                [this.bulkLookupUpdateConfig.lookupField]: e.detail
            }
        })
        this.saveUpdatedData(recordsToUpdate, true);
    }

    handleAllowBulk(e) {
        this.disableBulkUpdateButton = false;
        this.bulkLookupUpdateConfig = e.detail;
        this.lookupObject = this.bulkLookupUpdateConfig.lookupObject;
    }

    handleBlockBulk() {
        this.disableBulkUpdateButton = true;
    }

    handleLoading(e) {
        if (e.detail) {
            this.showSpinner();
            return;
        }

        this.hideSpinner();
    }
}