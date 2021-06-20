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

            for (Schema.FieldSetMember field : getFieldSetFieldsForObject(objectName, fieldSetName)) {

                Map<String, String> fieldConfiguration = getFieldToQueryConfiguration(field);

                response.add(
                    new UniversalDataWrapper.Column(
                        
                        field.getLabel(),
                        fieldConfiguration.get('fieldQueryPath'),
                        String.valueOf(field.getType()),

                        new UniversalDataWrapper.ColumnAttributes(
                            String.valueOf(field.getType()) != 'REFERENCE', //is Inline Editable
                            fieldConfiguration.get('fieldReferenceTo'),
                            fieldConfiguration.get('fieldApiName')
                        )
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

    private static String constructQueryUsingObjectNameAndFieldSet(String parentId, String parentFiledApi, String objectName, String fieldSetName) {
        String query = 'SELECT ';

        for (Schema.FieldSetMember field : getFieldSetFieldsForObject(objectName, fieldSetName)) {
            query += getFieldToQueryConfiguration(field).get('fieldQueryPath') + ', ';
        }

        query += 'Id FROM ' + objectName;
        query += ' WHERE ' + parentFiledApi + ' = :parentId';

        return query;
    }

    private static List<Schema.FieldSetMember> getFieldSetFieldsForObject(String objectName, String fieldSetName) {

        Schema.SObjectType sObjectType = Schema.getGlobalDescribe().get(objectName);
        Schema.DescribeSObjectResult describeSObjectResult = sObjectType.getDescribe();
        Schema.FieldSet fieldSet = describeSObjectResult.FieldSets.getMap().get(fieldSetName);
      
        return fieldSet.getFields(); 
    }  

    private static Map<String, String> getFieldToQueryConfiguration(Schema.FieldSetMember field) {
        Map<String, String> fieldConfiguration = new Map<String, String>();

        if (String.isNotBlank(field.getSObjectField().getDescribe().getRelationshipName()) 
            && !String.valueOf(field.getFieldPath()).contains('.')) { //it is Id field - use Name field instead

            fieldConfiguration.put('fieldQueryPath', field.getSObjectField().getDescribe().getRelationshipName() + '.Name');
            fieldConfiguration.put('fieldReferenceTo', field.getSObjectField().getDescribe().getReferenceTo()?.get(0)?.getDescribe()?.getName());
            fieldConfiguration.put('fieldApiName', field.getFieldPath());

            return fieldConfiguration;
        }

        fieldConfiguration.put('fieldQueryPath', field.getFieldPath());

        return fieldConfiguration;
    }
}