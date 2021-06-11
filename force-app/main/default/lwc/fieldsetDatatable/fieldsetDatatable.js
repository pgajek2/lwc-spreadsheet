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

    isLoading = false;

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
            console.log(this.data)
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
            console.log(this.columns)
        }).catch(error => {
            console.error(error);
        }).finally(() => {
            this.hideSpinner();
        });
    }

    saveUpdatedData(updatedData) {
        this.showSpinner();

        let records = this.trnsformUpdatedData(updatedData);
        saveRecords({
            records
        }).then(result => {
            this.showSuccessToast();
        }).catch(error => {
            this.showErrorToast(error);
            console.error(error);
        }).finally(() => {
            this.hideSpinner();
        });
    }

    trnsformUpdatedData(updatedData) {
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

    handleSave() {
        this.saveUpdatedData(
            this.template.querySelector('c-excel-table').getEditedData()
        );
    }

    handleReset() {
        this.getRecordsForObject();
    }

    handleLoading(e) {
        if (e.detail) {
            this.showSpinner();
            return;
        }

        this.hideSpinner();
    }
}