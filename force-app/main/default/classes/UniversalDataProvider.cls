public with sharing class UniversalDataProvider {


    @AuraEnabled
    public static List<sObject> getRecords(String parentId, String parentFiledApi, String objectName, String fieldSetName) {
        try {
            return Database.query(
                constructQueryUsingObjectNameAndFieldSet(parentId, parentFiledApi, objectName, fieldSetName)
            );
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static List<UniversalDataWrapper.Column> getColumns(String objectName, String fieldSetName) {
        try {
            List<UniversalDataWrapper.Column> response = new List<UniversalDataWrapper.Column>();
            String fieldPath = '';
            String lookupObject = '';
            String lookupFieldApi = '';

            for (Schema.FieldSetMember field : getFieldSetFieldsForObject(objectName, fieldSetName)) {

                fieldPath = field.getFieldPath();
                lookupObject = null;
                lookupFieldApi = null;

                if (field.getSObjectField().getDescribe().getRelationshipName() != null && !String.valueOf(field.getFieldPath()).contains('.')) { //it is relation field
                    fieldPath = field.getSObjectField().getDescribe().getRelationshipName() + '.Name';
                    lookupObject = field.getSObjectField().getDescribe().getReferenceTo()?.get(0)?.getDescribe()?.getName();
                    lookupFieldApi = field.getFieldPath();
                }

                response.add(
                    new UniversalDataWrapper.Column(
                        field.getLabel(),
                        fieldPath,
                        String.valueOf(field.getType()),
                        String.valueOf(field.getType()) != 'REFERENCE',
                        lookupObject,
                        lookupFieldApi
                    )
                );
            }
            return response;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    @AuraEnabled
    public static void saveRecords(List<sObject> records){
        try {
            update records;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    public static String constructQueryUsingObjectNameAndFieldSet(String parentId, String parentFiledApi, String objectName, String fieldSetName) {
        String query = 'SELECT ';
        String fieldPath = '';

        for (Schema.FieldSetMember field : getFieldSetFieldsForObject(objectName, fieldSetName)) {
            fieldPath = field.getFieldPath();
            
            if (field.getSObjectField().getDescribe().getRelationshipName() != null && !String.valueOf(field.getFieldPath()).contains('.')) { //it is relation field
                fieldPath = field.getSObjectField().getDescribe().getRelationshipName() + '.Name';
            }
            query += fieldPath + ', ';
        }
        query += 'Id FROM ' + objectName;
        query += ' WHERE ' + parentFiledApi + ' = :parentId';

        return query;
    }

    public static List<Schema.FieldSetMember> getFieldSetFieldsForObject(String objectName, String fieldSetName) {

        Schema.SObjectType sObjectType = Schema.getGlobalDescribe().get(objectName);
        Schema.DescribeSObjectResult describeSObjectResult = sObjectType.getDescribe();
        Schema.FieldSet fieldSet = describeSObjectResult.FieldSets.getMap().get(fieldSetName);
      
        return fieldSet.getFields(); 
    }  

    // public static Map<Id, String> convertIdsToName() {

    // }
}

// String parentId = 'a1c3m00000Ko5uJAAR';
// String parentFiledApi = 'KaptioTravel__Itinerary__c';
// String objectName = 'KaptioTravel__Itinerary_Item__c';
// String fieldSetName = 'KaptioTravel__ItineraryItemOnBookings';

// // System.debug(UniversalDataProvider.getFieldSetFieldsForObject(objectName, fieldSetName));
// // System.debug(Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get('KaptioTravel__Supplier__c').getDescribe().getReferenceTo());
// // System.debug(Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get('KaptioTravel__Supplier__c').getDescribe().isIdLookup());

// // Schema.getGlobalDescribe().get(objectName).getDescribe().getRecordTypeInfosByDeveloperName().get(recordTypeDeveloperName).getRecordTypeId();


// // for (Schema.FieldSetMember field : UniversalDataProvider.getFieldSetFieldsForObject(objectName, fieldSetName)) {
// //     System.debug(field.getFieldPath());
// //     System.debug(field.getSObjectField().getDescribe().getReferenceTargetField());
// //     System.debug(field.getSObjectField().getDescribe().getRelationshipName());
// //     System.debug(field.getSObjectField().getDescribe().getReferenceTo());
// //     System.debug(field.getSObjectField().getDescribe().getRelationshipOrder());
// //     System.debug('----------------');
// // }


// for (Schema.FieldSetMember field : UniversalDataProvider.getFieldSetFieldsForObject(objectName, fieldSetName)) {

//     String fieldPath = field.getFieldPath();
//     String lookupObject = null;
//     String lookupFieldApi = null;

//     if (field.getSObjectField().getDescribe().getRelationshipName() != null && !String.valueOf(field.getFieldPath()).contains('.')) { //it is relation field
//         fieldPath = field.getSObjectField().getDescribe().getRelationshipName() + '.Name';
//         lookupObject = field.getSObjectField().getDescribe().getReferenceTo()?.get(0)?.getDescribe()?.getName();
//         lookupFieldApi = field.getFieldPath();
//     }
//     System.debug(lookupObject + ' ' + lookupFieldApi);
//     System.debug('----------------');
// }
//System.debug(UniversalDataProvider.getColumns(objectName, fieldSetName));

// String query = 'SELECT ';
// String fieldPath = '';

// for (Schema.FieldSetMember field : UniversalDataProvider.getFieldSetFieldsForObject(objectName, fieldSetName)) {
//     fieldPath = field.getFieldPath();
//     System.debug(field.getSObjectField().getDescribe().getReferenceTo());
//     if (field.getSObjectField().getDescribe().getRelationshipName() != null && !String.valueOf(field.getFieldPath()).contains('.')) { //it is relation field
//         fieldPath = field.getSObjectField().getDescribe().getRelationshipName() + '.Name';
//     }
//     query += fieldPath + ', ';
// }
// query += 'Id FROM ' + objectName;
// query += ' WHERE ' + parentFiledApi + ' = :parentId';
// System.debug(query);